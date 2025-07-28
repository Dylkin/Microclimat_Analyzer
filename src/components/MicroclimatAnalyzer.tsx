import React from 'react';
import { BarChart3, Thermometer, Droplets, Wind, Sun } from 'lucide-react';

export const MicroclimatAnalyzer: React.FC = () => {
  const mockData = [
    { label: 'Температура', value: '22.5°C', icon: Thermometer, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Влажность', value: '65%', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Скорость ветра', value: '3.2 м/с', icon: Wind, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Освещенность', value: '850 лк', icon: Sun, color: 'text-yellow-600', bg: 'bg-yellow-100' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <BarChart3 className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Microclimat Analyzer</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Анализ микроклимата</h2>
        <p className="text-gray-600 mb-6">
          Система анализа микроклимата предназначена для мониторинга и анализа климатических параметров 
          в помещениях и на открытых территориях.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockData.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`p-2 rounded-lg ${item.bg}`}>
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <h3 className="font-medium text-gray-900">{item.label}</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">График температуры</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">График температуры за последние 24 часа</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">График влажности</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">График влажности за последние 24 часа</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Рекомендации</h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-green-900">Температура в норме</p>
              <p className="text-sm text-green-700">Текущая температура находится в оптимальном диапазоне для комфортного пребывания.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-yellow-900">Повышенная влажность</p>
              <p className="text-sm text-yellow-700">Рекомендуется включить вентиляцию для снижения уровня влажности.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};