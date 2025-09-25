/**
 * Live Intersection View Component
 * Project Raah-Sugam - AI-Powered Adaptive Traffic Control
 * 
 * Main dashboard component showing real-time traffic data, signal status,
 * and emergency alerts for the Polytechnic Roundabout intersection.
 * 
 * Author: Raah-Sugam Team
 * License: MIT
 */

import React, { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon, 
  SignalIcon,
  ClockIcon,
  TruckIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

// Components
import SignalRing from './SignalRing';
import TrafficMetrics from './TrafficMetrics';
import EmergencyAlert from './EmergencyAlert';
import ModeControl from '../controls/ModeControl';
import LiveChart from '../charts/LiveChart';

// Types
import { TrafficData, ConnectionStatus } from '../../types/traffic';

interface IntersectionViewProps {
  trafficData: TrafficData | null;
  connectionStatus: ConnectionStatus;
}

const IntersectionView: React.FC<IntersectionViewProps> = ({
  trafficData,
  connectionStatus
}) => {
  const [selectedApproach, setSelectedApproach] = useState<string>('all');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  // Handle emergency alerts
  useEffect(() => {
    if (trafficData?.emergencyActive && trafficData.emergencyDirection) {
      const message = `🚨 Emergency vehicle detected on ${trafficData.emergencyDirection} approach`;
      toast.error(message, {
        toastId: 'emergency-alert',
        autoClose: false,
        closeOnClick: false,
      });
    } else {
      toast.dismiss('emergency-alert');
    }
  }, [trafficData?.emergencyActive, trafficData?.emergencyDirection]);

  // Connection status indicator
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // Calculate total vehicle count
  const totalVehicles = trafficData?.queues 
    ? Object.values(trafficData.queues).reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Polytechnic Roundabout
          </h1>
          <p className="text-gray-600">
            Live Traffic Control Dashboard
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className={`text-sm font-medium ${getConnectionStatusColor()}`}>
              {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
            </span>
          </div>
          
          {/* Debug toggle */}
          <button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="text-gray-500 hover:text-gray-700"
            title="Toggle debug information"
          >
            <InformationCircleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Emergency Alert */}
      {trafficData?.emergencyActive && (
        <EmergencyAlert 
          direction={trafficData.emergencyDirection}
          duration={trafficData.emergencyDuration}
          onDismiss={() => {
            // Handle emergency dismissal if needed
          }}
        />
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left panel - Traffic metrics */}
        <div className="space-y-6">
          <TrafficMetrics 
            vehicleCounts={trafficData?.queues || {}}
            throughput={trafficData?.throughputPerMin || 0}
            avgWaitTime={trafficData?.avgWaitTime || 0}
            selectedApproach={selectedApproach}
            onApproachSelect={setSelectedApproach}
          />
          
          {/* Controller mode selection */}
          <ModeControl 
            currentMode={trafficData?.controllerMode || 'auto'}
            onModeChange={(mode) => {
              // Handle mode change
              console.log('Mode changed to:', mode);
            }}
          />
        </div>

        {/* Center panel - Signal ring and map */}
        <div className="flex flex-col space-y-6">
          <SignalRing 
            currentPhase={trafficData?.phase || 'unknown'}
            remainingTime={trafficData?.remainingSeconds || 0}
            approaches={trafficData?.queues || {}}
            selectedApproach={selectedApproach}
            onApproachSelect={setSelectedApproach}
          />

          {/* Current status summary */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Current Status</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <SignalIcon className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Current Phase</p>
                  <p className="font-semibold">
                    {trafficData?.phase || 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <ClockIcon className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Time Remaining</p>
                  <p className="font-semibold">
                    {trafficData?.remainingSeconds || 0}s
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <TruckIcon className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Vehicles</p>
                  <p className="font-semibold">{totalVehicles}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className={`w-5 h-5 rounded-full ${
                  trafficData?.controllerMode === 'auto' ? 'bg-green-500' :
                  trafficData?.controllerMode === 'heuristic' ? 'bg-yellow-500' :
                  trafficData?.controllerMode === 'fixed' ? 'bg-blue-500' : 'bg-gray-500'
                }`} />
                <div>
                  <p className="text-sm text-gray-600">Control Mode</p>
                  <p className="font-semibold capitalize">
                    {trafficData?.controllerMode || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel - Live charts */}
        <div className="space-y-6">
          <LiveChart 
            data={trafficData ? [{
              timestamp: new Date().toISOString(),
              vehicleCount: totalVehicles,
              avgWaitTime: trafficData.avgWaitTime || 0,
              throughput: trafficData.throughputPerMin || 0
            }] : []}
            selectedMetric="vehicleCount"
          />

          {/* Performance metrics */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Performance</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Throughput</span>
                <span className="font-semibold">
                  {trafficData?.throughputPerMin || 0} veh/min
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Wait Time</span>
                <span className="font-semibold">
                  {Math.round(trafficData?.avgWaitTime || 0)}s
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">System Latency</span>
                <span className="font-semibold">
                  {trafficData?.systemLatency || 0}ms
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Detection FPS</span>
                <span className="font-semibold">
                  {Math.round(trafficData?.detectionFps || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Debug information */}
          {showDebugInfo && trafficData && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Debug Information
              </h3>
              <pre className="text-xs text-gray-600 overflow-auto">
                {JSON.stringify(trafficData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Offline indicator */}
      {connectionStatus === 'disconnected' && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <span>System offline - showing last known data</span>
        </div>
      )}
    </div>
  );
};

export default IntersectionView;