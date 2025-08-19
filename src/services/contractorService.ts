import { Contractor, ContactPerson } from '../types/Contractor';

// Mock data for contractors
const mockContractors: Contractor[] = [
  {
    id: 'contractor-1',
    name: 'ООО "Строительная компания"',
    address: 'г. Москва, ул. Строительная, д. 15',
    coordinates: { lat: 55.7558, lng: 37.6176 },
    contactPersons: [
      {
        id: 'contact-1',
        name: 'Иванов Иван Иванович',
        phone: '+7 (495) 123-45-67',
        comment: 'Главный инженер'
      }
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'contractor-2',
    name: 'ИП Петров П.П.',
    address: 'г. Санкт-Петербург, пр. Невский, д. 100',
    contactPersons: [
      {
        id: 'contact-2',
        name: 'Петров Петр Петрович',
        phone: '+7 (812) 987-65-43',
        comment: 'Директор'
      }
    ],
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05')
  }
];

export class ContractorService {
  private contractors: Contractor[] = [...mockContractors];

  // Получение всех контрагентов
  async getAllContractors(): Promise<Contractor[]> {
    return [...this.contractors];
  }

  // Получение контрагента по ID
  async getContractorById(id: string): Promise<Contractor | null> {
    return this.contractors.find(c => c.id === id) || null;
  }

  // Создание контрагента
  async createContractor(contractorData: Omit<Contractor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contractor> {
    const newContractor: Contractor = {
      ...contractorData,
      id: 'contractor-' + Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.contractors.push(newContractor);
    return newContractor;
  }

  // Обновление контрагента
  async updateContractor(id: string, updates: Partial<Contractor>): Promise<void> {
    const index = this.contractors.findIndex(c => c.id === id);
    if (index !== -1) {
      this.contractors[index] = {
        ...this.contractors[index],
        ...updates,
        updatedAt: new Date()
      };
    }
  }

  // Удаление контрагента
  async deleteContractor(id: string): Promise<void> {
    this.contractors = this.contractors.filter(c => c.id !== id);
  }

  // Геокодирование адреса (заглушка для демонстрации)
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      // В реальном приложении здесь был бы вызов к API геокодирования
      // Например, Yandex Maps API или Google Maps API
      
      // Для демонстрации возвращаем случайные координаты в районе Москвы
      const lat = 55.7558 + (Math.random() - 0.5) * 0.1;
      const lng = 37.6176 + (Math.random() - 0.5) * 0.1;
      
      return { lat, lng };
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }
}

export const contractorService = new ContractorService();