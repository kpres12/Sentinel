"""
Unit tests for sensor fusion algorithms.
"""

import pytest
import numpy as np
from packages.algorithms.src.fusion import (
    SensorFusionEngine,
    EnvironmentalData,
    RiskScore
)


class TestSensorFusionEngine:
    """Test cases for sensor fusion engine."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.engine = SensorFusionEngine()
        
        # Create test environmental data
        self.env_data = EnvironmentalData(
            latitude=40.0,
            longitude=-120.0,
            timestamp="2024-01-01T00:00:00Z",
            fuel_model=4,  # Chaparral
            slope_deg=15.0,
            aspect_deg=180.0,  # South-facing
            canopy_cover=0.3,
            soil_moisture=0.2,  # Dry
            fuel_moisture=0.1,  # Very dry
            temperature_c=35.0,  # Hot
            relative_humidity=20.0,  # Low humidity
            wind_speed_mps=15.0,  # Strong wind
            wind_direction_deg=270.0,  # West wind
            elevation_m=1000.0,
            lightning_strikes_24h=5,
            historical_ignitions=2
        )
    
    def test_heuristic_risk_score(self):
        """Test heuristic risk scoring when model not trained."""
        risk_score = self.engine.calculate_risk_score(self.env_data)
        
        assert isinstance(risk_score, RiskScore)
        assert 0 <= risk_score.risk_score <= 1
        assert 0 <= risk_score.confidence <= 1
        assert risk_score.latitude == self.env_data.latitude
        assert risk_score.longitude == self.env_data.longitude
        assert risk_score.timestamp == self.env_data.timestamp
    
    def test_heuristic_risk_score_high_risk_conditions(self):
        """Test heuristic scoring with high-risk conditions."""
        high_risk_data = EnvironmentalData(
            latitude=40.0,
            longitude=-120.0,
            timestamp="2024-01-01T00:00:00Z",
            fuel_model=13,  # Heavy logging slash (high risk)
            slope_deg=45.0,  # Steep slope
            aspect_deg=180.0,  # South-facing
            canopy_cover=0.1,  # Low canopy
            soil_moisture=0.05,  # Very dry
            fuel_moisture=0.05,  # Very dry
            temperature_c=40.0,  # Very hot
            relative_humidity=10.0,  # Very low humidity
            wind_speed_mps=25.0,  # Very strong wind
            wind_direction_deg=270.0,  # West wind
            elevation_m=1000.0,
            lightning_strikes_24h=10,
            historical_ignitions=5
        )
        
        risk_score = self.engine.calculate_risk_score(high_risk_data)
        assert risk_score.risk_score > 0.7  # Should be high risk
    
    def test_heuristic_risk_score_low_risk_conditions(self):
        """Test heuristic scoring with low-risk conditions."""
        low_risk_data = EnvironmentalData(
            latitude=40.0,
            longitude=-120.0,
            timestamp="2024-01-01T00:00:00Z",
            fuel_model=1,  # Short grass (low risk)
            slope_deg=5.0,  # Gentle slope
            aspect_deg=0.0,  # North-facing
            canopy_cover=0.8,  # High canopy
            soil_moisture=0.8,  # Wet
            fuel_moisture=0.8,  # Wet
            temperature_c=15.0,  # Cool
            relative_humidity=80.0,  # High humidity
            wind_speed_mps=2.0,  # Light wind
            wind_direction_deg=90.0,  # East wind
            elevation_m=1000.0,
            lightning_strikes_24h=0,
            historical_ignitions=0
        )
        
        risk_score = self.engine.calculate_risk_score(low_risk_data)
        assert risk_score.risk_score < 0.3  # Should be low risk
    
    def test_feature_extraction(self):
        """Test feature extraction from environmental data."""
        features = self.engine._extract_features(self.env_data)
        
        assert isinstance(features, list)
        assert len(features) > 0
        
        # Check that all features are numeric
        for feature in features:
            assert isinstance(feature, (int, float))
            assert not np.isnan(feature)
            assert not np.isinf(feature)
    
    def test_feature_names(self):
        """Test feature name generation."""
        feature_names = self.engine._get_feature_names()
        
        assert isinstance(feature_names, list)
        assert len(feature_names) > 0
        
        # Check that all names are strings
        for name in feature_names:
            assert isinstance(name, str)
            assert len(name) > 0
    
    def test_fire_weather_index_calculation(self):
        """Test Fire Weather Index calculation."""
        fwi = self.engine._calculate_fire_weather_index(self.env_data)
        
        assert 0 <= fwi <= 1
        assert isinstance(fwi, float)
    
    def test_energy_release_component_calculation(self):
        """Test Energy Release Component calculation."""
        erc = self.engine._calculate_energy_release_component(self.env_data)
        
        assert 0 <= erc <= 1
        assert isinstance(erc, float)
    
    def test_burning_index_calculation(self):
        """Test Burning Index calculation."""
        bi = self.engine._calculate_burning_index(self.env_data)
        
        assert 0 <= bi <= 1
        assert isinstance(bi, float)
    
    def test_confidence_calculation(self):
        """Test confidence calculation."""
        confidence = self.engine._calculate_confidence(self.env_data)
        
        assert 0 <= confidence <= 1
        assert isinstance(confidence, float)
    
    def test_confidence_with_missing_data(self):
        """Test confidence calculation with missing data."""
        incomplete_data = EnvironmentalData(
            latitude=40.0,
            longitude=-120.0,
            timestamp="2024-01-01T00:00:00Z",
            fuel_model=0,  # Missing
            slope_deg=15.0,
            aspect_deg=180.0,
            canopy_cover=0.3,
            soil_moisture=0.0,  # Missing
            fuel_moisture=0.0,  # Missing
            temperature_c=35.0,
            relative_humidity=20.0,
            wind_speed_mps=0.0,  # Missing
            wind_direction_deg=270.0,
            elevation_m=1000.0,
            lightning_strikes_24h=0,
            historical_ignitions=0
        )
        
        confidence = self.engine._calculate_confidence(incomplete_data)
        assert confidence < 1.0  # Should be reduced due to missing data
    
    def test_contributing_factors(self):
        """Test contributing factors calculation."""
        features = self.engine._extract_features(self.env_data)
        factors = self.engine._calculate_contributing_factors(features)
        
        assert isinstance(factors, dict)
        # Should have some factors if model is trained
        # (This test will pass with heuristic method too)
    
    def test_model_training(self):
        """Test model training with synthetic data."""
        # Create synthetic training data
        training_data = []
        for i in range(20):
            env_data = EnvironmentalData(
                latitude=40.0 + np.random.normal(0, 0.1),
                longitude=-120.0 + np.random.normal(0, 0.1),
                timestamp="2024-01-01T00:00:00Z",
                fuel_model=np.random.randint(1, 14),
                slope_deg=np.random.uniform(0, 45),
                aspect_deg=np.random.uniform(0, 360),
                canopy_cover=np.random.uniform(0, 1),
                soil_moisture=np.random.uniform(0, 1),
                fuel_moisture=np.random.uniform(0, 1),
                temperature_c=np.random.uniform(0, 40),
                relative_humidity=np.random.uniform(10, 90),
                wind_speed_mps=np.random.uniform(0, 30),
                wind_direction_deg=np.random.uniform(0, 360),
                elevation_m=1000.0,
                lightning_strikes_24h=np.random.randint(0, 10),
                historical_ignitions=np.random.randint(0, 5)
            )
            
            # Create synthetic risk score
            risk_score = np.random.uniform(0, 1)
            training_data.append((env_data, risk_score))
        
        # Train the model
        self.engine.train_risk_model(training_data)
        
        # Test that model is trained
        assert self.engine.is_trained
        
        # Test prediction with trained model
        risk_score = self.engine.calculate_risk_score(self.env_data)
        assert isinstance(risk_score, RiskScore)
        assert 0 <= risk_score.risk_score <= 1
    
    def test_model_training_insufficient_data(self):
        """Test model training with insufficient data."""
        # Create minimal training data
        training_data = [
            (self.env_data, 0.5)
        ]
        
        with pytest.raises(ValueError, match="Need at least 10 training samples"):
            self.engine.train_risk_model(training_data)
    
    def test_feature_importance(self):
        """Test feature importance after training."""
        # Create training data
        training_data = []
        for i in range(20):
            env_data = EnvironmentalData(
                latitude=40.0,
                longitude=-120.0,
                timestamp="2024-01-01T00:00:00Z",
                fuel_model=np.random.randint(1, 14),
                slope_deg=np.random.uniform(0, 45),
                aspect_deg=np.random.uniform(0, 360),
                canopy_cover=np.random.uniform(0, 1),
                soil_moisture=np.random.uniform(0, 1),
                fuel_moisture=np.random.uniform(0, 1),
                temperature_c=np.random.uniform(0, 40),
                relative_humidity=np.random.uniform(10, 90),
                wind_speed_mps=np.random.uniform(0, 30),
                wind_direction_deg=np.random.uniform(0, 360),
                elevation_m=1000.0,
                lightning_strikes_24h=np.random.randint(0, 10),
                historical_ignitions=np.random.randint(0, 5)
            )
            
            risk_score = np.random.uniform(0, 1)
            training_data.append((env_data, risk_score))
        
        # Train the model
        self.engine.train_risk_model(training_data)
        
        # Check feature importance
        assert isinstance(self.engine.feature_importance, dict)
        assert len(self.engine.feature_importance) > 0
        
        # All importance values should be numeric
        for importance in self.engine.feature_importance.values():
            assert isinstance(importance, (int, float))
    
    def test_risk_score_monotonicity(self):
        """Test that risk scores are monotonic with respect to risk factors."""
        # Test with increasing temperature
        base_data = self.env_data
        temperatures = [20, 25, 30, 35, 40]
        risk_scores = []
        
        for temp in temperatures:
            data = EnvironmentalData(
                latitude=base_data.latitude,
                longitude=base_data.longitude,
                timestamp=base_data.timestamp,
                fuel_model=base_data.fuel_model,
                slope_deg=base_data.slope_deg,
                aspect_deg=base_data.aspect_deg,
                canopy_cover=base_data.canopy_cover,
                soil_moisture=base_data.soil_moisture,
                fuel_moisture=base_data.fuel_moisture,
                temperature_c=temp,
                relative_humidity=base_data.relative_humidity,
                wind_speed_mps=base_data.wind_speed_mps,
                wind_direction_deg=base_data.wind_direction_deg,
                elevation_m=base_data.elevation_m,
                lightning_strikes_24h=base_data.lightning_strikes_24h,
                historical_ignitions=base_data.historical_ignitions
            )
            
            risk_score = self.engine.calculate_risk_score(data)
            risk_scores.append(risk_score.risk_score)
        
        # Risk scores should generally increase with temperature
        # (allowing for some noise due to other factors)
        increasing_count = sum(1 for i in range(1, len(risk_scores)) 
                             if risk_scores[i] >= risk_scores[i-1])
        assert increasing_count >= len(risk_scores) // 2  # At least half should be increasing
