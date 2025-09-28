import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { ProjectDocument } from '../../utils/projectDocumentService';

interface StatusSummaryProps {
  documents: ProjectDocument[];
  commercialOfferDoc?: ProjectDocument;
  contractDoc?: ProjectDocument;
  approvedDocuments?: Set<string>;
}

export const StatusSummary: React.FC<StatusSummaryProps> = ({
  documents,
  commercialOfferDoc,
  contractDoc,
  approvedDocuments = new Set()
}) => {
  const getStatusIcon = (hasDocument: boolean) => {
    return hasDocument ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <Clock className="w-5 h-5 text-yellow-500" />
    );
  };

  // Функция для получения статуса коммерческого предложения
  const getCommercialOfferStatus = () => {
    if (!commercialOfferDoc) return 'В работе';
    if (approvedDocuments.has(commercialOfferDoc.id)) return 'Согласовано';
    return 'Согласование';
  };

  // Функция для получения статуса договора
  const getContractStatus = () => {
    if (!contractDoc) return 'В работе';
    if (approvedDocuments.has(contractDoc.id)) return 'Согласован';
    return 'Согласование';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Статус согласования</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {getStatusIcon(!!commercialOfferDoc)}
            <span className="font-medium text-gray-900">Коммерческое предложение</span>
          </div>
          <span className={`text-sm px-2 py-1 rounded-full ${
            commercialOfferDoc 
              ? (approvedDocuments.has(commercialOfferDoc.id) ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {commercialOfferDoc 
              ? (approvedDocuments.has(commercialOfferDoc.id) ? 'Согласовано' : 'Ожидает согласования')
              : 'Ожидает загрузки'
            }
          </span>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {getStatusIcon(!!contractDoc)}
            <span className="font-medium text-gray-900">Договор</span>
          </div>
          <span className={`text-sm px-2 py-1 rounded-full ${
            contractDoc 
              ? (approvedDocuments.has(contractDoc.id) ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {contractDoc 
              ? (approvedDocuments.has(contractDoc.id) ? 'Согласовано' : 'Ожидает согласования')
              : 'Ожидает загрузки'
            }
          </span>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Прогресс согласования</span>
          <span className="text-sm text-gray-500">
            {documents.length} из 2 документов
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(documents.length / 2) * 100}%` }}
          ></div>
        </div>
        <div>
          <span className={`text-sm px-2 py-1 rounded-full ${
            getCommercialOfferStatus() === 'Согласовано' ? 'bg-green-100 text-green-800' :
            getCommercialOfferStatus() === 'Согласование' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {getCommercialOfferStatus()}
          </span>
        </div>
        
        <div>
          <span className={`text-sm px-2 py-1 rounded-full ${
            getContractStatus() === 'Согласован' ? 'bg-green-100 text-green-800' :
            getContractStatus() === 'Согласование' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {getContractStatus()}
          </span>
        </div>
      </div>
    </div>
  );
};