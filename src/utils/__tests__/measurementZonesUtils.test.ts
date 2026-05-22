import {
  buildMeasurementZonesFromSummaries,
  buildMeasurementZonesFromStorageKeys,
  countMeasurementLevels,
  deduplicateStorageArtifactLevels,
  mergeMeasurementZones,
  normalizeMeasurementZones
} from '../measurementZonesUtils';

describe('measurementZonesUtils', () => {
  it('normalizeMeasurementZones maps snake_case fields', () => {
    const zones = normalizeMeasurementZones([
      {
        id: 'z1',
        zone_number: 1,
        measurement_levels: [{ id: 'l1', level: 0.1, equipment_name: 'Logger A' }]
      }
    ]);

    expect(zones).toHaveLength(1);
    expect(zones[0].zoneNumber).toBe(1);
    expect(zones[0].measurementLevels[0].level).toBe(0.1);
    expect(zones[0].measurementLevels[0].equipmentName).toBe('Logger A');
  });

  it('buildMeasurementZonesFromSummaries groups by zone and level', () => {
    const zones = buildMeasurementZonesFromSummaries([
      { zone_number: 1, measurement_level: 0.1, logger_name: 'L1' },
      { zone_number: 2, measurement_level: 0.2, logger_name: 'L2' },
      { zone_number: null, measurement_level: 1, logger_name: 'Ext' }
    ]);

    expect(countMeasurementLevels(zones)).toBe(3);
    expect(zones.find((z) => z.zoneNumber === 0)?.measurementLevels[0].level).toBe(1);
  });

  it('mergeMeasurementZones keeps equipment from existing rows', () => {
    const existing = [
      {
        id: 'zone-0',
        zoneNumber: 0,
        measurementLevels: [{ id: 'l0', level: 1, equipmentId: 'eq1', equipmentName: 'Ext' }]
      }
    ];
    const supplemental = buildMeasurementZonesFromSummaries([
      { zone_number: 1, measurement_level: 0.1, logger_name: 'Z1' }
    ]);

    const merged = mergeMeasurementZones(existing, supplemental);
    expect(countMeasurementLevels(merged)).toBe(2);
    expect(merged.find((z) => z.zoneNumber === 0)?.measurementLevels[0].equipmentName).toBe('Ext');
  });

  it('buildMeasurementZonesFromStorageKeys parses folder keys', () => {
    const zones = buildMeasurementZonesFromStorageKeys([
      'zone-0-level-1',
      'zone-1-level-0.1',
      'zone-2-level-0.2'
    ]);
    expect(countMeasurementLevels(zones)).toBe(3);
  });

  it('drops redundant zone-N-level-0 when zone-N-level-0.N exists in storage', () => {
    const zones = buildMeasurementZonesFromStorageKeys([
      'zone-2-level-0',
      'zone-2-level-0.2',
      'zone-3-level-0',
      'zone-3-level-0.3'
    ]);
    expect(countMeasurementLevels(zones)).toBe(2);
    expect(zones.find((z) => z.zoneNumber === 2)?.measurementLevels.map((l) => l.level)).toEqual([0.2]);
    expect(zones.find((z) => z.zoneNumber === 3)?.measurementLevels.map((l) => l.level)).toEqual([0.3]);
  });

  it('deduplicateStorageArtifactLevels removes level 0 when fractional exists', () => {
    const zones = deduplicateStorageArtifactLevels([
      {
        id: 'z2',
        zoneNumber: 2,
        measurementLevels: [
          { id: 'l0', level: 0, equipmentName: '' },
          { id: 'l02', level: 0.2, equipmentName: 'L2' }
        ]
      }
    ]);
    expect(zones[0].measurementLevels).toHaveLength(1);
    expect(zones[0].measurementLevels[0].level).toBe(0.2);
  });
});
