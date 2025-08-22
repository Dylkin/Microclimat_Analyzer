import React, { useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, Building2, User, Phone, MessageSquare } from 'lucide-react';
import { Contractor } from '../types/Contractor';

interface ContractorMapProps {
  contractor: Contractor;
  onBack: () => void;
}

export const ContractorMap: React.FC<ContractorMapProps> = ({ contractor, onBack }) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contractor.latitude || !contractor.longitude || !mapRef.current) return;

    // Создаем карту с использованием Leaflet через CDN
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      // Добавляем CSS для Leaflet
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Инициализируем карту
      const L = (window as any).L;
      const map = L.map(mapRef.current).setView([contractor.latitude, contractor.longitude], 15);

      // Добавляем тайлы OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Добавляем маркер
      const marker = L.marker([contractor.latitude, contractor.longitude]).addTo(map);
      
      // Создаем popup с информацией о контрагенте
      const popupContent = `
        <div class="p-2">
          <h3 class="font-semibold text-gray-900 mb-2">${contractor.name}</h3>
          ${contractor.address ? `<p class="text-sm text-gray-600 mb-2">${contractor.address}</p>` : ''}
          ${contractor.contacts.length > 0 ? `
            <div class="text-sm">
              <p class="font-medium text-gray-700 mb-1">Контакты:</p>
              ${contractor.contacts.map(contact => `
                <div class="mb-1">
                  <div class="font-medium">${contact.employeeName}</div>
                  ${contact.phone ? `<div class="text-gray-600">${contact.phone}</div>` : ''}
                  ${contact.comment ? `<div class="text-gray-500 text-xs">${contact.comment}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
      
      marker.bindPopup(popupContent).openPopup();

      // Cleanup function
      return () => {
        map.remove();
      };
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup script
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [contractor]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <MapPin className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Карта контрагента</h1>
      </div>

      {/* Contractor Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start space-x-4">
          <div className="bg-indigo-100 p-3 rounded-lg">
            <Building2 className="w-8 h-8 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{contractor.name}</h2>
            {contractor.address && (
              <div className="flex items-start space-x-2 mb-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <span className="text-gray-600">{contractor.address}</span>
              </div>
            )}
            
            {contractor.contacts.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Контакты:</h3>
                <div className="space-y-2">
                  {contractor.contacts.map((contact) => (
                    <div key={contact.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{contact.employeeName}</span>
                      </div>
                      {contact.phone && (
                        <div className="flex items-center space-x-2 mb-1">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{contact.phone}</span>
                        </div>
                      )}
                      {contact.comment && (
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500 text-sm">{contact.comment}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Местоположение на карте</h3>
          {contractor.latitude && contractor.longitude && (
            <p className="text-sm text-gray-600 mt-1">
              Координаты: {contractor.latitude.toFixed(6)}, {contractor.longitude.toFixed(6)}
            </p>
          )}
        </div>
        <div 
          ref={mapRef} 
          className="w-full h-96"
          style={{ minHeight: '400px' }}
        >
          {/* Fallback content while map loads */}
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Загрузка карты...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Управление картой:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Используйте колесо мыши для масштабирования</li>
          <li>• Перетаскивайте карту для перемещения</li>
          <li>• Нажмите на маркер для просмотра информации</li>
        </ul>
      </div>
    </div>
  );
};