"""
Configuration Management for Edge Service
Project Raah-Sugam - AI-Powered Adaptive Traffic Control

Centralized configuration loading from environment variables and config files.
Supports development, production, and Jetson deployment scenarios.

Author: Raah-Sugam Team
License: MIT
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@dataclass
class CameraConfig:
    """Camera and video source configuration"""
    source_type: str = "file"  # file, rtsp, device
    rtsp_url: str = "rtsp://admin:password@192.168.1.100:554/stream1"
    demo_video_path: str = "/app/demo_data/polytechnic_roundabout.mp4"
    device_id: int = 0
    width: int = 1280
    height: int = 720
    fps: int = 30

@dataclass
class YOLOConfig:
    """YOLOv8 model configuration"""
    model_path: str = "/app/models/yolov8n.pt"
    confidence_threshold: float = 0.5
    iou_threshold: float = 0.45
    max_detections: int = 100
    input_size: int = 640
    use_gpu: bool = True
    half_precision: bool = True
    tensorrt_optimization: bool = False
    min_box_area: int = 100
    max_box_area: int = 100000

@dataclass
class RLConfig:
    """Reinforcement Learning controller configuration"""
    model_path: str = "/app/models/traffic_rl_model.h5"
    confidence_threshold: float = 0.7
    learning_rate: float = 0.001
    epsilon: float = 0.1
    training_mode: bool = False
    replay_buffer_capacity: int = 10000
    batch_size: int = 64
    target_update_period: int = 100

@dataclass
class ProcessingConfig:
    """Processing and performance configuration"""
    target_fps: int = 10
    frame_skip: int = 2
    input_size: int = 640
    enable_performance_monitoring: bool = True
    metrics_collection_interval: int = 10

@dataclass
class IntersectionConfig:
    """Traffic intersection configuration"""
    id: str = "polytechnic-5way"
    name: str = "Polytechnic Roundabout"
    approaches: List[str] = field(default_factory=lambda: [
        "north", "south", "east", "west", "northeast"
    ])
    phases: List[Dict] = field(default_factory=list)
    min_green_time: int = 10
    max_green_time: int = 60
    yellow_time: int = 3
    all_red_time: int = 2
    default_emergency_phase: str = "north_through"
    max_episode_steps: int = 1000

@dataclass
class EmergencyConfig:
    """Emergency vehicle preemption configuration"""
    preemption_duration: int = 30
    confidence_threshold: float = 0.8
    debounce_time: int = 3

@dataclass
class SafetyConfig:
    """Safety constraints configuration"""
    min_green: int = 10
    max_green: int = 60
    yellow: int = 3
    all_red: int = 2
    enforce_constraints: bool = True

@dataclass
class CommunicationConfig:
    """Backend communication configuration"""
    backend_url: str = "http://backend:8080"
    websocket_url: str = "ws://backend:8080/telemetry"
    reconnect_interval: int = 5
    telemetry_send_interval: int = 1
    timeout: int = 10
    max_retries: int = 3

@dataclass
class LoggingConfig:
    """Logging configuration"""
    level: str = "INFO"
    format: str = "json"
    file_path: str = "/app/logs/edge.log"
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    backup_count: int = 5
    enable_console: bool = True

@dataclass
class HardwareConfig:
    """Hardware optimization configuration"""
    use_gpu: bool = True
    gpu_memory_limit: int = 2048
    cpu_threads: int = 4
    enable_tensorrt: bool = False

@dataclass
class DebugConfig:
    """Debug and development configuration"""
    enable_debug_visualization: bool = False
    save_debug_frames: bool = False
    debug_output_path: str = "/app/debug/"
    enable_profiling: bool = False

class Config:
    """
    Main configuration class that loads and validates all settings
    """
    
    def __init__(self, config_file: Optional[str] = None):
        """
        Initialize configuration from environment variables and optional config file
        
        Args:
            config_file: Optional path to JSON configuration file
        """
        self.config_file = config_file
        self._load_configuration()
    
    def _load_configuration(self):
        """Load configuration from environment variables and files"""
        
        # Load from config file if provided
        file_config = {}
        if self.config_file and Path(self.config_file).exists():
            with open(self.config_file, 'r') as f:
                file_config = json.load(f)
        
        # Camera configuration
        self.camera = CameraConfig(
            source_type=os.getenv("CAMERA_SOURCE_TYPE", "file"),
            rtsp_url=os.getenv("CAMERA_RTSP_URL", "rtsp://admin:password@192.168.1.100:554/stream1"),
            demo_video_path=os.getenv("CAMERA_DEMO_VIDEO_PATH", "/app/demo_data/polytechnic_roundabout.mp4"),
            device_id=int(os.getenv("CAMERA_DEVICE_ID", "0")),
            width=int(os.getenv("CAMERA_WIDTH", "1280")),
            height=int(os.getenv("CAMERA_HEIGHT", "720")),
            fps=int(os.getenv("CAMERA_FPS", "30"))
        )
        
        # YOLO configuration
        self.yolo = YOLOConfig(
            model_path=os.getenv("YOLO_MODEL_PATH", "/app/models/yolov8n.pt"),
            confidence_threshold=float(os.getenv("YOLO_CONFIDENCE_THRESHOLD", "0.5")),
            iou_threshold=float(os.getenv("YOLO_IOU_THRESHOLD", "0.45")),
            use_gpu=os.getenv("YOLO_USE_GPU", "true").lower() == "true",
            half_precision=os.getenv("YOLO_HALF_PRECISION", "true").lower() == "true",
            tensorrt_optimization=os.getenv("YOLO_TENSORRT_OPTIMIZATION", "false").lower() == "true"
        )
        
        # RL configuration
        self.rl = RLConfig(
            model_path=os.getenv("RL_MODEL_PATH", "/app/models/traffic_rl_model.h5"),
            confidence_threshold=float(os.getenv("RL_CONFIDENCE_THRESHOLD", "0.7")),
            learning_rate=float(os.getenv("RL_LEARNING_RATE", "0.001")),
            epsilon=float(os.getenv("RL_EPSILON", "0.1")),
            training_mode=os.getenv("RL_TRAINING_MODE", "false").lower() == "true"
        )
        
        # Processing configuration
        self.processing = ProcessingConfig(
            target_fps=int(os.getenv("PROCESSING_TARGET_FPS", "10")),
            frame_skip=int(os.getenv("PROCESSING_FRAME_SKIP", "2")),
            enable_performance_monitoring=os.getenv("ENABLE_PERFORMANCE_MONITORING", "true").lower() == "true"
        )
        
        # Intersection configuration
        intersection_approaches = os.getenv("INTERSECTION_APPROACHES")
        if intersection_approaches:
            approaches = intersection_approaches.split(",")
        else:
            approaches = ["north", "south", "east", "west", "northeast"]
        
        self.intersection = IntersectionConfig(
            id=os.getenv("INTERSECTION_ID", "polytechnic-5way"),
            name=os.getenv("INTERSECTION_NAME", "Polytechnic Roundabout"),
            approaches=approaches,
            min_green_time=int(os.getenv("MIN_GREEN_TIME", "10")),
            max_green_time=int(os.getenv("MAX_GREEN_TIME", "60"))
        )
        
        # Load intersection phases from file config or environment
        if "phases" in file_config:
            self.intersection.phases = file_config["phases"]
        else:
            # Default phases for 5-way intersection
            self.intersection.phases = [
                {
                    "id": "north_through",
                    "name": "North Through",
                    "allowed_approaches": ["north"],
                    "min_green": 10,
                    "max_green": 45
                },
                {
                    "id": "south_through", 
                    "name": "South Through",
                    "allowed_approaches": ["south"],
                    "min_green": 10,
                    "max_green": 45
                },
                {
                    "id": "east_west_through",
                    "name": "East-West Through",
                    "allowed_approaches": ["east", "west"],
                    "min_green": 15,
                    "max_green": 60
                },
                {
                    "id": "northeast_through",
                    "name": "Northeast Through",
                    "allowed_approaches": ["northeast"],
                    "min_green": 8,
                    "max_green": 30
                }
            ]
        
        # Emergency configuration
        self.emergency = EmergencyConfig(
            preemption_duration=int(os.getenv("EMERGENCY_PREEMPTION_DURATION", "30")),
            confidence_threshold=float(os.getenv("EMERGENCY_CONFIDENCE_THRESHOLD", "0.8"))
        )
        
        # Safety configuration
        self.safety = SafetyConfig(
            min_green=int(os.getenv("MIN_GREEN_TIME", "10")),
            max_green=int(os.getenv("MAX_GREEN_TIME", "60")),
            yellow=int(os.getenv("YELLOW_TIME", "3")),
            all_red=int(os.getenv("ALL_RED_TIME", "2"))
        )
        
        # Communication configuration
        self.communication = CommunicationConfig(
            backend_url=os.getenv("BACKEND_URL", "http://backend:8080"),
            websocket_url=os.getenv("WEBSOCKET_URL", "ws://backend:8080/telemetry"),
            reconnect_interval=int(os.getenv("WEBSOCKET_RECONNECT_INTERVAL", "5")),
            telemetry_send_interval=int(os.getenv("TELEMETRY_SEND_INTERVAL", "1"))
        )
        
        # Logging configuration
        self.logging = LoggingConfig(
            level=os.getenv("LOG_LEVEL", "INFO"),
            format=os.getenv("LOG_FORMAT", "json"),
            file_path=os.getenv("LOG_FILE", "/app/logs/edge.log"),
            enable_console=os.getenv("LOG_CONSOLE", "true").lower() == "true"
        )
        
        # Hardware configuration
        self.hardware = HardwareConfig(
            use_gpu=os.getenv("USE_GPU", "true").lower() == "true",
            gpu_memory_limit=int(os.getenv("GPU_MEMORY_LIMIT", "2048")),
            cpu_threads=int(os.getenv("CPU_THREADS", "4")),
            enable_tensorrt=os.getenv("ENABLE_TENSORRT", "false").lower() == "true"
        )
        
        # Debug configuration
        self.debug = DebugConfig(
            enable_debug_visualization=os.getenv("ENABLE_DEBUG_VISUALIZATION", "false").lower() == "true",
            save_debug_frames=os.getenv("SAVE_DEBUG_FRAMES", "false").lower() == "true",
            debug_output_path=os.getenv("DEBUG_OUTPUT_PATH", "/app/debug/")
        )
    
    def validate(self) -> bool:
        """
        Validate configuration values
        
        Returns:
            bool: True if configuration is valid
        """
        try:
            # Validate camera configuration
            if self.camera.source_type not in ["file", "rtsp", "device"]:
                raise ValueError(f"Invalid camera source type: {self.camera.source_type}")
            
            # Validate model paths exist
            if not Path(self.yolo.model_path).parent.exists():
                Path(self.yolo.model_path).parent.mkdir(parents=True, exist_ok=True)
            
            # Validate threshold ranges
            if not 0.0 <= self.yolo.confidence_threshold <= 1.0:
                raise ValueError("YOLO confidence threshold must be between 0.0 and 1.0")
            
            if not 0.0 <= self.rl.confidence_threshold <= 1.0:
                raise ValueError("RL confidence threshold must be between 0.0 and 1.0")
            
            # Validate timing constraints
            if self.safety.min_green >= self.safety.max_green:
                raise ValueError("Min green time must be less than max green time")
            
            # Create necessary directories
            for path in [self.logging.file_path, self.debug.debug_output_path]:
                Path(path).parent.mkdir(parents=True, exist_ok=True)
            
            return True
            
        except Exception as e:
            print(f"Configuration validation failed: {e}")
            return False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return {
            "camera": self.camera.__dict__,
            "yolo": self.yolo.__dict__,
            "rl": self.rl.__dict__,
            "processing": self.processing.__dict__,
            "intersection": self.intersection.__dict__,
            "emergency": self.emergency.__dict__,
            "safety": self.safety.__dict__,
            "communication": self.communication.__dict__,
            "logging": self.logging.__dict__,
            "hardware": self.hardware.__dict__,
            "debug": self.debug.__dict__
        }
    
    def save_to_file(self, filepath: str):
        """Save configuration to JSON file"""
        with open(filepath, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
    
    @classmethod
    def from_file(cls, filepath: str) -> 'Config':
        """Load configuration from JSON file"""
        return cls(config_file=filepath)