import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  state: string;
  locationId: string | null;
  location: string;
  status: string;
}

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  isActive: boolean;
}

const VehicleLocations: React.FC = () => {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [draggedVehicle, setDraggedVehicle] = useState<Vehicle | null>(null);

  // Fetch all locations
  const { data: locations = [], isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ['locations', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      const response = await apiService.getPickupLocations(currentCompanyId);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!currentCompanyId
  });

  // Fetch all vehicles
  const { data: allVehicles = [], isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ['vehicles', 'all', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      const response = await apiService.getVehicles({
        page: 1,
        pageSize: 1000,
        companyId: currentCompanyId
      });
      return response.data.items || [];
    },
    enabled: !!currentCompanyId
  });

  // Update vehicle location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ vehicleId, locationId }: { vehicleId: string; locationId: string | null }) => {
      return apiService.updateVehicle(vehicleId, { locationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle location updated successfully!');
    },
    onError: (error: any) => {
      console.error('Error updating vehicle location:', error);
      toast.error('Failed to update vehicle location');
    }
  });

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, vehicle: Vehicle) => {
    setDraggedVehicle(vehicle);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnAllVehicles = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedVehicle) {
      updateLocationMutation.mutate({
        vehicleId: draggedVehicle.id,
        locationId: null
      });
      setDraggedVehicle(null);
    }
  };

  const handleDropOnLocation = (e: React.DragEvent, locationId: string) => {
    e.preventDefault();
    if (draggedVehicle) {
      updateLocationMutation.mutate({
        vehicleId: draggedVehicle.id,
        locationId: locationId
      });
      setDraggedVehicle(null);
    }
  };

  // Filter vehicles
  const vehiclesWithoutLocation = allVehicles.filter((v: Vehicle) => !v.locationId);
  const vehiclesInLocation = selectedLocationId
    ? allVehicles.filter((v: Vehicle) => v.locationId === selectedLocationId)
    : [];

  const selectedLocation = locations.find((l: Location) => l.id === selectedLocationId);

  if (locationsLoading || vehiclesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Vehicle Location Management</h1>

      {/* Location Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Location to View:
        </label>
        <select
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select a location --</option>
          {locations.map((location: Location) => (
            <option key={location.id} value={location.id}>
              {location.name} - {location.city}, {location.state}
            </option>
          ))}
        </select>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT SIDE - All Vehicles (unassigned) */}
        <div
          className="bg-white rounded-lg shadow-lg p-6 min-h-[600px]"
          onDragOver={handleDragOver}
          onDrop={handleDropOnAllVehicles}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Unassigned Vehicles</h2>
            <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
              {vehiclesWithoutLocation.length}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Drag vehicles from here to assign them to a location →
          </p>
          
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {vehiclesWithoutLocation.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                All vehicles are assigned to locations
              </div>
            ) : (
              vehiclesWithoutLocation.map((vehicle: Vehicle) => (
                <div
                  key={vehicle.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, vehicle)}
                  className="p-4 border border-gray-300 rounded-lg cursor-move hover:bg-gray-50 hover:border-blue-400 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-lg">
                        {vehicle.make} {vehicle.model} {vehicle.year}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">{vehicle.licensePlate}</span>
                        {vehicle.state && <span className="ml-2">({vehicle.state})</span>}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      vehicle.status === 'available' 
                        ? 'bg-green-100 text-green-800'
                        : vehicle.status === 'rented'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {vehicle.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT SIDE - Location Vehicles */}
        <div
          className="bg-white rounded-lg shadow-lg p-6 min-h-[600px]"
          onDragOver={selectedLocationId ? handleDragOver : undefined}
          onDrop={selectedLocationId ? (e) => handleDropOnLocation(e, selectedLocationId) : undefined}
        >
          {selectedLocationId ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {selectedLocation?.name}
                </h2>
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                  {vehiclesInLocation.length}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {selectedLocation?.address}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                {selectedLocation?.city}, {selectedLocation?.state}
              </p>
              <p className="text-sm text-blue-600 mb-4">
                ← Drop vehicles here to assign to this location
              </p>

              <div className="space-y-2 max-h-[450px] overflow-y-auto">
                {vehiclesInLocation.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No vehicles assigned to this location
                  </div>
                ) : (
                  vehiclesInLocation.map((vehicle: Vehicle) => (
                    <div
                      key={vehicle.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, vehicle)}
                      className="p-4 border border-blue-300 rounded-lg cursor-move hover:bg-blue-50 hover:border-blue-500 transition-colors bg-blue-50/30"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-lg">
                            {vehicle.make} {vehicle.model} {vehicle.year}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">{vehicle.licensePlate}</span>
                            {vehicle.state && <span className="ml-2">({vehicle.state})</span>}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          vehicle.status === 'available' 
                            ? 'bg-green-100 text-green-800'
                            : vehicle.status === 'rented'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {vehicle.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-lg">Select a location above to view its vehicles</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li>Select a location from the dropdown to view vehicles at that location</li>
          <li>Drag vehicles from the left panel to assign them to the selected location</li>
          <li>Drag vehicles from the right panel back to the left to unassign them</li>
          <li>Vehicle cards show the make, model, year, license plate, and status</li>
        </ul>
      </div>
    </div>
  );
};

export default VehicleLocations;

