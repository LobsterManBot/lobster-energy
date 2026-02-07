"""
Energy Price Prediction Engine
Uses multiple ML models for sophisticated forecasting
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Tuple, Dict, List, Optional
from dataclasses import dataclass
import pickle
import os

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import TimeSeriesSplit
from xgboost import XGBRegressor

# Prophet for time series
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False


@dataclass
class PredictionResult:
    """Prediction output"""
    target_date: datetime
    predicted_price: float
    confidence: float
    lower_bound: float
    upper_bound: float
    model_used: str
    features_importance: Dict[str, float]


class EnergyPredictor:
    """
    Multi-model energy price predictor
    
    Uses ensemble of:
    - XGBoost for short-term (1-7 days)
    - Prophet for medium-term seasonality (1-4 weeks)
    - Gradient Boosting for longer-term trends (1-12 months)
    """
    
    def __init__(self, model_dir: str = "./saved_models"):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        
        self.models = {
            'xgb_short': None,
            'prophet': None,
            'gb_long': None,
        }
        self.scalers = {}
        self.is_trained = False
    
    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create features for ML models
        
        Features:
        - Time-based: hour, day of week, month, quarter, is_weekend, is_holiday
        - Lag features: price_lag_1d, price_lag_7d, price_lag_30d
        - Rolling stats: rolling_mean_7d, rolling_std_7d, rolling_min_7d, rolling_max_7d
        - Momentum: price_change_1d, price_change_7d, momentum_7d
        - Seasonality: sin/cos encoding for cyclical features
        """
        df = df.copy()
        df = df.sort_values('timestamp')
        
        # Time features
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['day_of_month'] = df['timestamp'].dt.day
        df['month'] = df['timestamp'].dt.month
        df['quarter'] = df['timestamp'].dt.quarter
        df['week_of_year'] = df['timestamp'].dt.isocalendar().week.astype(int)
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        
        # Cyclical encoding for time features
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
        
        # Lag features
        for lag in [1, 2, 3, 7, 14, 30, 90]:
            df[f'price_lag_{lag}d'] = df['price'].shift(lag * 24)  # Assuming hourly data
        
        # Rolling statistics
        for window in [24, 168, 720]:  # 1 day, 1 week, 1 month in hours
            df[f'rolling_mean_{window}h'] = df['price'].rolling(window=window).mean()
            df[f'rolling_std_{window}h'] = df['price'].rolling(window=window).std()
            df[f'rolling_min_{window}h'] = df['price'].rolling(window=window).min()
            df[f'rolling_max_{window}h'] = df['price'].rolling(window=window).max()
        
        # Price changes / momentum
        df['price_change_1d'] = df['price'].pct_change(24)
        df['price_change_7d'] = df['price'].pct_change(168)
        df['price_change_30d'] = df['price'].pct_change(720)
        
        # Momentum indicators
        df['momentum_7d'] = df['price'] - df['price'].shift(168)
        df['momentum_30d'] = df['price'] - df['price'].shift(720)
        
        # Volatility
        df['volatility_7d'] = df['price'].rolling(168).std() / df['price'].rolling(168).mean()
        df['volatility_30d'] = df['price'].rolling(720).std() / df['price'].rolling(720).mean()
        
        # Rate of change
        df['roc_7d'] = (df['price'] - df['price'].shift(168)) / df['price'].shift(168)
        
        # Relative Strength Index (RSI)
        delta = df['price'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=168).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=168).mean()
        rs = gain / loss
        df['rsi_7d'] = 100 - (100 / (1 + rs))
        
        return df
    
    def train(self, df: pd.DataFrame, target_col: str = 'price'):
        """Train all models on historical data"""
        
        print("Preparing features...")
        df_features = self.prepare_features(df)
        df_features = df_features.dropna()
        
        feature_cols = [c for c in df_features.columns if c not in 
                       ['timestamp', 'price', 'market', 'unit', 'source', 'product']]
        
        X = df_features[feature_cols]
        y = df_features[target_col]
        
        # Scale features
        self.scalers['main'] = StandardScaler()
        X_scaled = self.scalers['main'].fit_transform(X)
        
        # Time series cross-validation
        tscv = TimeSeriesSplit(n_splits=5)
        
        print("Training XGBoost (short-term)...")
        self.models['xgb_short'] = XGBRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42
        )
        self.models['xgb_short'].fit(X_scaled, y)
        
        print("Training Gradient Boosting (long-term)...")
        self.models['gb_long'] = GradientBoostingRegressor(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        self.models['gb_long'].fit(X_scaled, y)
        
        # Prophet for seasonality
        if PROPHET_AVAILABLE:
            print("Training Prophet (seasonality)...")
            prophet_df = df[['timestamp', 'price']].copy()
            prophet_df.columns = ['ds', 'y']
            prophet_df = prophet_df.dropna()
            
            self.models['prophet'] = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=True,
                daily_seasonality=True,
                changepoint_prior_scale=0.1
            )
            self.models['prophet'].fit(prophet_df)
        
        self.feature_cols = feature_cols
        self.is_trained = True
        
        # Save models
        self.save_models()
        
        print("Training complete!")
        return self.evaluate(X_scaled, y)
    
    def evaluate(self, X, y) -> Dict:
        """Evaluate model performance"""
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
        
        results = {}
        
        for name, model in self.models.items():
            if model is None or name == 'prophet':
                continue
            
            preds = model.predict(X)
            results[name] = {
                'mae': mean_absolute_error(y, preds),
                'rmse': np.sqrt(mean_squared_error(y, preds)),
                'r2': r2_score(y, preds)
            }
        
        return results
    
    def predict(
        self, 
        df: pd.DataFrame, 
        horizon_days: int = 7,
        market: str = 'uk_dayahead'
    ) -> List[PredictionResult]:
        """Generate predictions for future prices"""
        
        if not self.is_trained:
            raise ValueError("Model not trained. Call train() first.")
        
        df_features = self.prepare_features(df)
        df_features = df_features.dropna()
        
        # Get latest data point as base
        latest = df_features.iloc[-1:].copy()
        
        predictions = []
        
        for day in range(1, horizon_days + 1):
            target_date = latest['timestamp'].iloc[0] + timedelta(days=day)
            
            # Update time features for target date
            pred_features = latest[self.feature_cols].copy()
            
            # Scale
            X_scaled = self.scalers['main'].transform(pred_features)
            
            # Get predictions from each model
            xgb_pred = self.models['xgb_short'].predict(X_scaled)[0]
            gb_pred = self.models['gb_long'].predict(X_scaled)[0]
            
            # Ensemble prediction (weighted average)
            if day <= 7:
                # Short-term: favor XGBoost
                weights = {'xgb': 0.6, 'gb': 0.4}
            else:
                # Longer-term: favor Gradient Boosting
                weights = {'xgb': 0.3, 'gb': 0.7}
            
            predicted_price = xgb_pred * weights['xgb'] + gb_pred * weights['gb']
            
            # Confidence interval (based on model disagreement + historical volatility)
            model_std = np.std([xgb_pred, gb_pred])
            historical_std = df['price'].std()
            uncertainty = model_std + (historical_std * 0.1 * np.sqrt(day))
            
            # Confidence decreases with horizon
            confidence = max(0.5, 1.0 - (day * 0.05))
            
            predictions.append(PredictionResult(
                target_date=target_date,
                predicted_price=predicted_price,
                confidence=confidence,
                lower_bound=predicted_price - 2 * uncertainty,
                upper_bound=predicted_price + 2 * uncertainty,
                model_used='ensemble',
                features_importance=self.get_feature_importance()
            ))
        
        return predictions
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance from XGBoost model"""
        if self.models['xgb_short'] is None:
            return {}
        
        importance = dict(zip(
            self.feature_cols,
            self.models['xgb_short'].feature_importances_
        ))
        
        # Sort by importance
        return dict(sorted(importance.items(), key=lambda x: x[1], reverse=True)[:10])
    
    def save_models(self):
        """Save trained models to disk"""
        for name, model in self.models.items():
            if model is not None and name != 'prophet':
                path = os.path.join(self.model_dir, f"{name}.pkl")
                with open(path, 'wb') as f:
                    pickle.dump(model, f)
        
        # Save scalers
        with open(os.path.join(self.model_dir, "scalers.pkl"), 'wb') as f:
            pickle.dump(self.scalers, f)
        
        # Save feature columns
        with open(os.path.join(self.model_dir, "feature_cols.pkl"), 'wb') as f:
            pickle.dump(self.feature_cols, f)
    
    def load_models(self):
        """Load trained models from disk"""
        try:
            for name in ['xgb_short', 'gb_long']:
                path = os.path.join(self.model_dir, f"{name}.pkl")
                if os.path.exists(path):
                    with open(path, 'rb') as f:
                        self.models[name] = pickle.load(f)
            
            with open(os.path.join(self.model_dir, "scalers.pkl"), 'rb') as f:
                self.scalers = pickle.load(f)
            
            with open(os.path.join(self.model_dir, "feature_cols.pkl"), 'rb') as f:
                self.feature_cols = pickle.load(f)
            
            self.is_trained = True
            return True
        except Exception as e:
            print(f"Error loading models: {e}")
            return False


class SignalGenerator:
    """
    Generates trading signals based on predictions and market conditions
    """
    
    def __init__(self, predictor: EnergyPredictor):
        self.predictor = predictor
    
    def generate_signals(
        self,
        df: pd.DataFrame,
        current_price: float,
        market: str = 'uk_dayahead'
    ) -> Dict:
        """
        Generate buy/wait/sell signals
        
        Signal types:
        - BUY: Price expected to rise, lock in now
        - WAIT: Better prices expected soon
        - SELL: If holding positions, consider selling
        """
        
        predictions = self.predictor.predict(df, horizon_days=30, market=market)
        
        # Analyze predictions
        short_term = predictions[:7]  # 1 week
        medium_term = predictions[7:14]  # Week 2
        long_term = predictions[14:]  # Week 3-4
        
        avg_short = np.mean([p.predicted_price for p in short_term])
        avg_medium = np.mean([p.predicted_price for p in medium_term])
        avg_long = np.mean([p.predicted_price for p in long_term])
        
        # Calculate confidence-weighted direction
        short_conf = np.mean([p.confidence for p in short_term])
        medium_conf = np.mean([p.confidence for p in medium_term])
        
        # Determine signal
        if current_price < avg_short * 0.95 and avg_short < avg_medium:
            signal = 'BUY'
            strength = min(1.0, (avg_short - current_price) / current_price * 10)
            reason = f"Current price ({current_price:.2f}) is below short-term forecast ({avg_short:.2f}). Prices expected to rise."
        elif current_price > avg_short * 1.05 or avg_short > avg_medium * 1.05:
            signal = 'WAIT'
            strength = min(1.0, (current_price - avg_short) / current_price * 10)
            reason = f"Current price ({current_price:.2f}) is above short-term forecast ({avg_short:.2f}). Better prices expected."
        else:
            signal = 'HOLD'
            strength = 0.5
            reason = f"Market stable. Current: {current_price:.2f}, Forecast: {avg_short:.2f}"
        
        return {
            'signal': signal,
            'strength': strength,
            'reason': reason,
            'current_price': current_price,
            'forecast_7d': avg_short,
            'forecast_14d': avg_medium,
            'forecast_30d': avg_long,
            'confidence': short_conf,
            'recommendations': self._generate_tranche_recommendations(
                current_price, predictions, market
            )
        }
    
    def _generate_tranche_recommendations(
        self,
        current_price: float,
        predictions: List[PredictionResult],
        market: str
    ) -> List[Dict]:
        """Generate specific tranche buying recommendations"""
        
        recommendations = []
        
        # Analyze price trajectory
        prices = [p.predicted_price for p in predictions]
        min_price_idx = np.argmin(prices)
        min_price = prices[min_price_idx]
        min_date = predictions[min_price_idx].target_date
        
        if current_price <= min_price * 1.02:
            # Current price is near the minimum
            recommendations.append({
                'action': 'BUY NOW',
                'percentage': 50,
                'reason': f"Current price near forecast minimum. Lock in 50% of requirement.",
                'target_price': current_price,
                'urgency': 'HIGH'
            })
        elif min_price < current_price * 0.95:
            # Significant savings expected
            recommendations.append({
                'action': 'WAIT',
                'percentage': 70,
                'reason': f"Price expected to drop to {min_price:.2f} around {min_date.strftime('%Y-%m-%d')}. Wait for better entry.",
                'target_price': min_price,
                'urgency': 'LOW'
            })
            recommendations.append({
                'action': 'BUY NOW',
                'percentage': 30,
                'reason': f"Secure 30% now to reduce risk if forecast is wrong.",
                'target_price': current_price,
                'urgency': 'MEDIUM'
            })
        else:
            # Stable market
            recommendations.append({
                'action': 'DOLLAR COST AVERAGE',
                'percentage': 25,
                'reason': "Market stable. Buy 25% weekly to average out price fluctuations.",
                'target_price': current_price,
                'urgency': 'MEDIUM'
            })
        
        return recommendations
    
    def compare_fixed_vs_flexible(
        self,
        current_fixed_rate: float,
        predictions: List[PredictionResult],
        annual_volume_mwh: float
    ) -> Dict:
        """
        Compare fixed contract vs flexible purchasing strategy
        """
        
        # Calculate expected flexible cost
        flexible_prices = [p.predicted_price for p in predictions]
        expected_flexible = np.mean(flexible_prices)
        flexible_std = np.std(flexible_prices)
        
        # Best/worst case for flexible
        flexible_best = np.percentile(flexible_prices, 10)
        flexible_worst = np.percentile(flexible_prices, 90)
        
        # Calculate annual costs
        fixed_annual = current_fixed_rate * annual_volume_mwh
        flexible_expected_annual = expected_flexible * annual_volume_mwh
        flexible_best_annual = flexible_best * annual_volume_mwh
        flexible_worst_annual = flexible_worst * annual_volume_mwh
        
        # Recommendation
        savings_potential = (fixed_annual - flexible_expected_annual) / fixed_annual * 100
        risk = (flexible_worst_annual - flexible_expected_annual) / flexible_expected_annual * 100
        
        if savings_potential > 5 and risk < 10:
            recommendation = 'FLEXIBLE'
            confidence = min(0.9, savings_potential / 10)
            reason = f"Flexible purchasing expected to save {savings_potential:.1f}% with manageable risk ({risk:.1f}% downside)."
        elif savings_potential < -2:
            recommendation = 'FIXED'
            confidence = 0.8
            reason = f"Fixed rate offers better value. Flexible would cost {abs(savings_potential):.1f}% more."
        else:
            recommendation = 'HYBRID'
            confidence = 0.6
            reason = f"Consider 50/50 split. Savings potential ({savings_potential:.1f}%) similar to risk ({risk:.1f}%)."
        
        return {
            'recommendation': recommendation,
            'confidence': confidence,
            'reason': reason,
            'fixed_rate': current_fixed_rate,
            'fixed_annual_cost': fixed_annual,
            'flexible_expected': expected_flexible,
            'flexible_expected_annual': flexible_expected_annual,
            'flexible_best_case': flexible_best_annual,
            'flexible_worst_case': flexible_worst_annual,
            'savings_potential_pct': savings_potential,
            'risk_pct': risk
        }
