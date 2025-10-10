"""
Sensor fusion and risk scoring algorithms.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from sklearn.linear_model import LogisticRegression
from sklearn.isotonic import IsotonicRegression
from sklearn.preprocessing import StandardScaler
import math


@dataclass
class EnvironmentalData:
    """Environmental conditions for a grid cell."""
    latitude: float
    longitude: float
    timestamp: str
    fuel_model: int  # Anderson 13 fuel model
    slope_deg: float
    aspect_deg: float
    canopy_cover: float  # 0-1
    soil_moisture: float  # 0-1
    fuel_moisture: float  # 0-1
    temperature_c: float
    relative_humidity: float  # 0-100
    wind_speed_mps: float
    wind_direction_deg: float
    elevation_m: float
    lightning_strikes_24h: int = 0
    historical_ignitions: int = 0


@dataclass
class RiskScore:
    """Risk score for a grid cell."""
    latitude: float
    longitude: float
    risk_score: float  # 0-1
    confidence: float  # 0-1
    contributing_factors: Dict[str, float]
    timestamp: str


class SensorFusionEngine:
    """Engine for sensor fusion and risk scoring."""
    
    def __init__(self):
        self.risk_model = None
        self.scaler = StandardScaler()
        self.isotonic_regressor = IsotonicRegression(out_of_bounds='clip')
        self.feature_importance = {}
        self.is_trained = False
    
    def train_risk_model(self, training_data: List[Tuple[EnvironmentalData, float]]):
        """
        Train the risk scoring model.
        
        Args:
            training_data: List of (environmental_data, risk_score) tuples
        """
        if len(training_data) < 10:
            raise ValueError("Need at least 10 training samples")
        
        # Extract features and labels
        X = []
        y = []
        
        for env_data, risk_score in training_data:
            features = self._extract_features(env_data)
            X.append(features)
            y.append(risk_score)
        
        X = np.array(X)
        y = np.array(y)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train logistic regression model
        self.risk_model = LogisticRegression(
            random_state=42,
            max_iter=1000,
            class_weight='balanced'
        )
        self.risk_model.fit(X_scaled, y)
        
        # Train isotonic regression for calibration
        y_pred = self.risk_model.predict_proba(X_scaled)[:, 1]
        self.isotonic_regressor.fit(y_pred, y)
        
        # Store feature importance
        self.feature_importance = dict(zip(
            self._get_feature_names(),
            self.risk_model.coef_[0]
        ))
        
        self.is_trained = True
    
    def calculate_risk_score(self, env_data: EnvironmentalData) -> RiskScore:
        """
        Calculate risk score for environmental data.
        
        Args:
            env_data: Environmental conditions
            
        Returns:
            Risk score with confidence and contributing factors
        """
        if not self.is_trained:
            # Use simple heuristic if model not trained
            return self._heuristic_risk_score(env_data)
        
        # Extract features
        features = self._extract_features(env_data)
        features_scaled = self.scaler.transform([features])
        
        # Predict risk score
        risk_prob = self.risk_model.predict_proba(features_scaled)[0, 1]
        risk_score = self.isotonic_regressor.transform([risk_prob])[0]
        
        # Calculate confidence based on feature quality
        confidence = self._calculate_confidence(env_data)
        
        # Calculate contributing factors
        contributing_factors = self._calculate_contributing_factors(features)
        
        return RiskScore(
            latitude=env_data.latitude,
            longitude=env_data.longitude,
            risk_score=float(risk_score),
            confidence=confidence,
            contributing_factors=contributing_factors,
            timestamp=env_data.timestamp
        )
    
    def _extract_features(self, env_data: EnvironmentalData) -> List[float]:
        """Extract features from environmental data."""
        features = []
        
        # Fuel model (one-hot encoded)
        fuel_model_features = [0.0] * 13
        if 1 <= env_data.fuel_model <= 13:
            fuel_model_features[env_data.fuel_model - 1] = 1.0
        features.extend(fuel_model_features)
        
        # Terrain features
        features.append(env_data.slope_deg / 90.0)  # Normalize slope
        features.append(math.sin(math.radians(env_data.aspect_deg)))  # Aspect sine
        features.append(math.cos(math.radians(env_data.aspect_deg)))  # Aspect cosine
        features.append(env_data.canopy_cover)
        features.append(env_data.elevation_m / 4000.0)  # Normalize elevation
        
        # Moisture features
        features.append(env_data.soil_moisture)
        features.append(env_data.fuel_moisture)
        
        # Weather features
        features.append(env_data.temperature_c / 50.0)  # Normalize temperature
        features.append(env_data.relative_humidity / 100.0)  # Normalize humidity
        features.append(env_data.wind_speed_mps / 30.0)  # Normalize wind speed
        features.append(math.sin(math.radians(env_data.wind_direction_deg)))  # Wind direction sine
        features.append(math.cos(math.radians(env_data.wind_direction_deg)))  # Wind direction cosine
        
        # Fire history
        features.append(min(env_data.lightning_strikes_24h / 10.0, 1.0))  # Normalize lightning
        features.append(min(env_data.historical_ignitions / 5.0, 1.0))  # Normalize ignitions
        
        # Derived features
        features.append(self._calculate_fire_weather_index(env_data))
        features.append(self._calculate_energy_release_component(env_data))
        features.append(self._calculate_burning_index(env_data))
        
        return features
    
    def _get_feature_names(self) -> List[str]:
        """Get feature names for interpretation."""
        names = []
        
        # Fuel model features
        for i in range(13):
            names.append(f"fuel_model_{i+1}")
        
        # Terrain features
        names.extend([
            "slope_normalized",
            "aspect_sin",
            "aspect_cos",
            "canopy_cover",
            "elevation_normalized"
        ])
        
        # Moisture features
        names.extend([
            "soil_moisture",
            "fuel_moisture"
        ])
        
        # Weather features
        names.extend([
            "temperature_normalized",
            "humidity_normalized",
            "wind_speed_normalized",
            "wind_direction_sin",
            "wind_direction_cos"
        ])
        
        # Fire history
        names.extend([
            "lightning_strikes_normalized",
            "historical_ignitions_normalized"
        ])
        
        # Derived features
        names.extend([
            "fire_weather_index",
            "energy_release_component",
            "burning_index"
        ])
        
        return names
    
    def _calculate_fire_weather_index(self, env_data: EnvironmentalData) -> float:
        """Calculate Fire Weather Index (FWI)."""
        # Simplified FWI calculation
        temp = env_data.temperature_c
        rh = env_data.relative_humidity
        wind = env_data.wind_speed_mps
        
        # Fine fuel moisture code (simplified)
        ffmc = 101 - rh
        if temp > 20:
            ffmc += (temp - 20) * 2
        
        # Wind effect
        wind_factor = 1 + (wind / 20.0)
        
        fwi = ffmc * wind_factor / 100.0
        return min(1.0, max(0.0, fwi))
    
    def _calculate_energy_release_component(self, env_data: EnvironmentalData) -> float:
        """Calculate Energy Release Component (ERC)."""
        # Simplified ERC calculation
        temp = env_data.temperature_c
        rh = env_data.relative_humidity
        wind = env_data.wind_speed_mps
        
        # Base ERC from temperature and humidity
        base_erc = (temp - 10) / 30.0 * (100 - rh) / 100.0
        
        # Wind adjustment
        wind_factor = 1 + (wind / 15.0)
        
        erc = base_erc * wind_factor
        return min(1.0, max(0.0, erc))
    
    def _calculate_burning_index(self, env_data: EnvironmentalData) -> float:
        """Calculate Burning Index (BI)."""
        # Simplified BI calculation
        temp = env_data.temperature_c
        rh = env_data.relative_humidity
        wind = env_data.wind_speed_mps
        slope = env_data.slope_deg
        
        # Base burning index
        base_bi = (temp / 40.0) * (100 - rh) / 100.0
        
        # Wind and slope effects
        wind_slope_factor = 1 + (wind / 20.0) + (slope / 45.0)
        
        bi = base_bi * wind_slope_factor
        return min(1.0, max(0.0, bi))
    
    def _calculate_confidence(self, env_data: EnvironmentalData) -> float:
        """Calculate confidence in risk score."""
        confidence = 1.0
        
        # Reduce confidence for missing data
        if env_data.fuel_model == 0:
            confidence *= 0.8
        if env_data.soil_moisture == 0:
            confidence *= 0.9
        if env_data.fuel_moisture == 0:
            confidence *= 0.9
        if env_data.wind_speed_mps == 0:
            confidence *= 0.8
        
        # Reduce confidence for extreme values (may indicate data quality issues)
        if env_data.temperature_c < -20 or env_data.temperature_c > 60:
            confidence *= 0.7
        if env_data.relative_humidity < 5 or env_data.relative_humidity > 100:
            confidence *= 0.7
        
        return confidence
    
    def _calculate_contributing_factors(self, features: List[float]) -> Dict[str, float]:
        """Calculate contributing factors to risk score."""
        if not self.is_trained:
            return {}
        
        feature_names = self._get_feature_names()
        factors = {}
        
        for i, (name, importance) in enumerate(zip(feature_names, self.risk_model.coef_[0])):
            if abs(importance) > 0.1:  # Only include significant factors
                factors[name] = float(importance * features[i])
        
        return factors
    
    def _heuristic_risk_score(self, env_data: EnvironmentalData) -> RiskScore:
        """Calculate risk score using heuristic method when model not trained."""
        risk_score = 0.0
        
        # Fuel model risk (Anderson 13 fuel models)
        fuel_risk = {
            1: 0.1,   # Short grass
            2: 0.2,   # Timber with grass
            3: 0.3,   # Tall grass
            4: 0.4,   # Chaparral
            5: 0.5,   # Brush
            6: 0.6,   # Dormant brush
            7: 0.7,   # Southern rough
            8: 0.8,   # Closed timber litter
            9: 0.9,   # Hardwood litter
            10: 0.8,  # Timber with litter
            11: 0.6,  # Light logging slash
            12: 0.7,  # Medium logging slash
            13: 0.8   # Heavy logging slash
        }
        risk_score += fuel_risk.get(env_data.fuel_model, 0.5) * 0.3
        
        # Slope risk
        slope_risk = min(1.0, env_data.slope_deg / 45.0)
        risk_score += slope_risk * 0.2
        
        # Moisture risk (inverse relationship)
        moisture_risk = (1.0 - env_data.soil_moisture) * 0.5 + (1.0 - env_data.fuel_moisture) * 0.5
        risk_score += moisture_risk * 0.2
        
        # Weather risk
        temp_risk = min(1.0, max(0.0, (env_data.temperature_c - 20) / 30.0))
        humidity_risk = (100 - env_data.relative_humidity) / 100.0
        wind_risk = min(1.0, env_data.wind_speed_mps / 20.0)
        
        weather_risk = (temp_risk + humidity_risk + wind_risk) / 3.0
        risk_score += weather_risk * 0.2
        
        # Fire history risk
        history_risk = min(1.0, (env_data.lightning_strikes_24h + env_data.historical_ignitions) / 10.0)
        risk_score += history_risk * 0.1
        
        # Ensure risk score is between 0 and 1
        risk_score = min(1.0, max(0.0, risk_score))
        
        return RiskScore(
            latitude=env_data.latitude,
            longitude=env_data.longitude,
            risk_score=risk_score,
            confidence=0.7,  # Lower confidence for heuristic method
            contributing_factors={
                "fuel_model": fuel_risk.get(env_data.fuel_model, 0.5),
                "slope": slope_risk,
                "moisture": moisture_risk,
                "weather": weather_risk,
                "history": history_risk
            },
            timestamp=env_data.timestamp
        )
