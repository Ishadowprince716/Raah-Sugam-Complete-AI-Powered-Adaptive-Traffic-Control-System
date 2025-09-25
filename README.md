# Project Raah-Sugam: AI-Powered Adaptive Traffic Control System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://docker.com)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://python.org)
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org)

## 🚦 Overview

Project Raah-Sugam is a production-ready, AI-powered adaptive traffic signal control system designed for Indian cities, specifically targeting the five-legged Polytechnic Roundabout in Bhopal. The system uses edge AI with YOLOv8 and reinforcement learning to optimize traffic flow in real-time.

### 🎯 Smart India Hackathon 2025
- **Theme**: Transportation & Logistics; Smart Automation  
- **Category**: Software
- **Problem**: Adaptive Traffic Control for Bhopal's Urban Gridlock
- **Solution**: AI-powered signal control with emergency preemption

### Key Features

- **Real-time Traffic Analysis**: YOLOv8-nano on Jetson Nano for vehicle detection and classification
- **Dynamic Signal Phasing**: TensorFlow Agents reinforcement learning for adaptive control
- **Emergency Vehicle Preemption**: Automatic detection and green wave creation
- **Edge-First Architecture**: Minimal cloud dependency with local processing
- **Production Ready**: Docker containers, observability, security, and comprehensive testing

## 🏗️ Architecture
<img width="793" height="794" alt="Screenshot 2025-09-25 230410" src="https://github.com/user-attachments/assets/eef2f291-bb71-4e18-a67f-c5f619533c04" />




## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- NVIDIA Jetson Nano (optional, for edge deployment)
- Node.js 18+ (for development)
- Python 3.9+ (for edge development)

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/raah-sugam.git
cd raah-sugam

# Start the development stack
make dev

# Or using Docker Compose directly
docker-compose -f docker-compose.dev.yml up -d --build
```

### Production Deployment

```bash
# Build and start production services
make prod

# Or using Docker Compose directly
docker-compose -f docker-compose.prod.yml up -d --build
```

### Jetson Nano Edge Deployment

```bash
# Deploy to Jetson device (requires SSH access)
./infra/scripts/jetson_deploy.sh <jetson-ip> <username>

# Or manually on Jetson
cd edge/
docker build -t raah-sugam-edge .
docker run -d --gpus all --name traffic-edge raah-sugam-edge
```

## 📊 Demo & Testing

### Running the Demo

```bash
# Start demo with sample traffic video
make demo

# Access the dashboard
open http://localhost:3000

# Monitor system metrics
open http://localhost:3001  # Grafana (admin/admin)
```

### Testing

```bash
# Run all tests
make test

# Individual test suites
make test-edge      # Edge AI tests
make test-backend   # API tests
make test-dashboard # E2E tests
```

## 🛠️ Development

### Project Structure

```
raah-sugam/
├── edge/           # Python edge AI service (Jetson Nano)
├── backend/        # Node.js API server and database
├── dashboard/      # React TypeScript frontend
├── infra/          # Docker, K8s, monitoring configs
└── docs/           # Documentation and API specs
```

### Environment Configuration

Each service has its own `.env.example` file. Copy and customize:

```bash
# Root environment
cp .env.example .env

# Service-specific environments
cp edge/.env.example edge/.env
cp backend/.env.example backend/.env
cp dashboard/.env.example dashboard/.env
```

## 📈 Performance Targets

- **Latency**: P50 end-to-end ≤ 300ms, P99 ≤ 700ms
- **Detection Accuracy**: >90% vehicle classification
- **Traffic Improvement**: 15-25% reduction in average wait time
- **Emergency Response**: ≤ 2 seconds preemption latency

## 🔧 Configuration

### Intersection Setup

1. Configure camera ROIs in `edge/demo_data/camera_config.json`
2. Define signal phases in the database via dashboard
3. Set up approach mappings and traffic flow patterns

### Controller Modes

- **Auto**: RL-based adaptive control (default)
- **Heuristic**: Max-pressure algorithm fallback
- **Fixed**: Traditional fixed-timer signals
- **Manual**: Operator override capability

## 🔒 Security Features

- JWT-based authentication for admin endpoints
- Input validation and rate limiting
- CORS protection and security headers  
- No raw video persistence (privacy by design)
- Encrypted inter-service communication

## 📚 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Development Setup](docs/DEVELOPMENT.md)
- [Demo Walkthrough](docs/demo/demo_script.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and add tests
4. Run the test suite: `make test`
5. Submit a pull request

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

## 🙏 Acknowledgments

- **SMART INDIA HACKATHON 2025** for the problem statement
- **Bhopal Smart City Development Corporation** for the target use case
- **NVIDIA Jetson Community** for edge AI capabilities
- **TensorFlow Agents Team** for reinforcement learning frameworks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Impact

Project Raah-Sugam aims to:
- Reduce commuter travel time by 15-25% at critical intersections
- Lower vehicle emissions through reduced idle time
- Improve safety with emergency vehicle preemption
- Provide a scalable blueprint for other Indian smart cities
- Support UN SDG 11: Sustainable Cities and Communities

## 📞 Contact

For questions, support, or collaboration opportunities:
- Create an issue in this repository
- Email: patelmrrahul199@gmail.com
- Moblile no: +917581982880

---

**Built with ❤️ for Smart India Hackathon 2025**

*Making Indian cities smarter, one intersection at a time.*
