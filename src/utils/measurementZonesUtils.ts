import { MeasurementLevel, MeasurementZone } from '../types/QualificationObject';

const ZONE_LEVEL_KEY_RE = /^zone-(\d+)-level-(.+)$/;

export function normalizeMeasurementZones(raw: unknown): MeasurementZone[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((zone: any) => {
    const zoneNumberRaw = zone.zoneNumber ?? zone.zone_number;
    const zoneNumber =
      zoneNumberRaw === null || zoneNumberRaw === undefined
        ? 0
        : typeof zoneNumberRaw === 'string'
          ? parseInt(zoneNumberRaw, 10)
          : Number(zoneNumberRaw);

    const levelsRaw = zone.measurementLevels ?? zone.measurement_levels ?? [];
    const measurementLevels: MeasurementLevel[] = Array.isArray(levelsRaw)
      ? levelsRaw.map((level: any) => {
          const levelRaw = level.level ?? level.measurement_level;
          const levelNum =
            levelRaw === null || levelRaw === undefined
              ? 0
              : typeof levelRaw === 'string'
                ? parseFloat(levelRaw)
                : Number(levelRaw);

          return {
            id: level.id || `level-${zoneNumber}-${levelNum}-${Math.random().toString(36).slice(2, 9)}`,
            level: levelNum,
            equipmentId: level.equipmentId ?? level.equipment_id ?? '',
            equipmentName: level.equipmentName ?? level.equipment_name ?? '',
            equipmentType: level.equipmentType ?? level.equipment_type,
            planPosX: level.planPosX ?? level.plan_pos_x,
            planPosY: level.planPosY ?? level.plan_pos_y
          };
        })
      : [];

    return {
      id: zone.id || `zone-${zoneNumber}-${Math.random().toString(36).slice(2, 9)}`,
      zoneNumber: Number.isNaN(zoneNumber) ? 0 : zoneNumber,
      planPosX: zone.planPosX ?? zone.plan_pos_x,
      planPosY: zone.planPosY ?? zone.plan_pos_y,
      measurementLevels
    };
  });
}

export function countMeasurementLevels(zones: MeasurementZone[]): number {
  return zones.reduce((sum, zone) => sum + zone.measurementLevels.length, 0);
}

/** Убирает дубли level=0, если в зоне уже есть дробный уровень (0.1, 0.2 …) из сводок/Storage. */
export function deduplicateStorageArtifactLevels(zones: MeasurementZone[]): MeasurementZone[] {
  return zones.map((zone) => {
    if (zone.zoneNumber === 0) {
      return zone;
    }
    const hasFractionalLevel = zone.measurementLevels.some((l) => l.level > 0 && l.level < 1);
    if (!hasFractionalLevel) {
      return zone;
    }
    return {
      ...zone,
      measurementLevels: zone.measurementLevels
        .filter((l) => l.level !== 0)
        .sort((a, b) => a.level - b.level)
    };
  });
}

/** Убирает устаревшие папки zone-N-level-0, если есть zone-N-level-0.N (дробный уровень). */
export function filterRedundantStorageKeys(keys: string[]): string[] {
  const parsed = keys
    .map((key) => {
      const match = key.match(ZONE_LEVEL_KEY_RE);
      if (!match) {
        return null;
      }
      return { key, zoneNumber: parseInt(match[1], 10), level: parseFloat(match[2]) };
    })
    .filter((item): item is { key: string; zoneNumber: number; level: number } => item !== null);

  const zonesWithFractional = new Set(
    parsed.filter((p) => p.zoneNumber > 0 && p.level > 0 && p.level < 1).map((p) => p.zoneNumber)
  );

  return parsed
    .filter((p) => {
      if (p.zoneNumber === 0 || p.level !== 0) {
        return true;
      }
      return !zonesWithFractional.has(p.zoneNumber);
    })
    .map((p) => p.key);
}

export function buildMeasurementZonesFromSummaries(summaries: any[]): MeasurementZone[] {
  const zoneMap = new Map<number, MeasurementZone>();

  for (const summary of summaries) {
    const zoneRaw = summary.zone_number ?? summary.zoneNumber;
    const zoneNumber =
      zoneRaw === null || zoneRaw === undefined
        ? 0
        : typeof zoneRaw === 'string'
          ? parseInt(zoneRaw, 10)
          : Number(zoneRaw);

    const levelRaw = summary.measurement_level ?? summary.measurementLevel ?? summary.level;
    const level =
      levelRaw === null || levelRaw === undefined
        ? 0
        : typeof levelRaw === 'string'
          ? parseFloat(levelRaw)
          : Number(levelRaw);

    const loggerName =
      (typeof summary.logger_name === 'string' ? summary.logger_name : '') ||
      (typeof summary.loggerName === 'string' ? summary.loggerName : '') ||
      '';

    if (!zoneMap.has(zoneNumber)) {
      zoneMap.set(zoneNumber, {
        id: `zone-${zoneNumber}-sync`,
        zoneNumber,
        measurementLevels: []
      });
    }

    const zone = zoneMap.get(zoneNumber)!;
    const exists = zone.measurementLevels.some((l) => l.level === level);
    if (!exists) {
      zone.measurementLevels.push({
        id: `level-${zoneNumber}-${level}-sync`,
        level,
        equipmentId: '',
        equipmentName: loggerName.trim()
      });
    } else if (loggerName.trim()) {
      const existing = zone.measurementLevels.find((l) => l.level === level);
      if (existing && !existing.equipmentName) {
        existing.equipmentName = loggerName.trim();
      }
    }
  }

  return Array.from(zoneMap.values())
    .map((zone) => ({
      ...zone,
      measurementLevels: [...zone.measurementLevels].sort((a, b) => a.level - b.level)
    }))
    .sort((a, b) => a.zoneNumber - b.zoneNumber);
}

export function buildMeasurementZonesFromStorageKeys(keys: string[]): MeasurementZone[] {
  const zoneMap = new Map<number, MeasurementZone>();

  for (const key of filterRedundantStorageKeys(keys)) {
    const match = key.match(ZONE_LEVEL_KEY_RE);
    if (!match) {
      continue;
    }
    const zoneNumber = parseInt(match[1], 10);
    const level = parseFloat(match[2]);
    if (Number.isNaN(zoneNumber) || Number.isNaN(level)) {
      continue;
    }

    if (!zoneMap.has(zoneNumber)) {
      zoneMap.set(zoneNumber, {
        id: `zone-${zoneNumber}-storage`,
        zoneNumber,
        measurementLevels: []
      });
    }

    const zone = zoneMap.get(zoneNumber)!;
    if (!zone.measurementLevels.some((l) => l.level === level)) {
      zone.measurementLevels.push({
        id: `level-${zoneNumber}-${level}-storage`,
        level,
        equipmentId: '',
        equipmentName: ''
      });
    }
  }

  return deduplicateStorageArtifactLevels(
    Array.from(zoneMap.values())
      .map((zone) => ({
        ...zone,
        measurementLevels: [...zone.measurementLevels].sort((a, b) => a.level - b.level)
      }))
      .sort((a, b) => a.zoneNumber - b.zoneNumber)
  );
}

export function mergeMeasurementZones(
  existing: MeasurementZone[],
  supplemental: MeasurementZone[]
): MeasurementZone[] {
  if (supplemental.length === 0) {
    return existing;
  }
  if (existing.length === 0) {
    return supplemental;
  }

  const zoneByNumber = new Map<number, MeasurementZone>();

  for (const zone of supplemental) {
    zoneByNumber.set(zone.zoneNumber, {
      ...zone,
      measurementLevels: zone.measurementLevels.map((l) => ({ ...l }))
    });
  }

  for (const existingZone of existing) {
    const target = zoneByNumber.get(existingZone.zoneNumber);
    if (!target) {
      zoneByNumber.set(existingZone.zoneNumber, {
        ...existingZone,
        measurementLevels: existingZone.measurementLevels.map((l) => ({ ...l }))
      });
      continue;
    }

    for (const existingLevel of existingZone.measurementLevels) {
      const match = target.measurementLevels.find((l) => l.level === existingLevel.level);
      if (match) {
        if (existingLevel.equipmentId) match.equipmentId = existingLevel.equipmentId;
        if (existingLevel.equipmentName) match.equipmentName = existingLevel.equipmentName;
        if (existingLevel.equipmentType) match.equipmentType = existingLevel.equipmentType;
        if (existingLevel.planPosX !== undefined) match.planPosX = existingLevel.planPosX;
        if (existingLevel.planPosY !== undefined) match.planPosY = existingLevel.planPosY;
        if (existingLevel.id) match.id = existingLevel.id;
      } else {
        target.measurementLevels.push({ ...existingLevel });
      }
    }

    if (existingZone.planPosX !== undefined) target.planPosX = existingZone.planPosX;
    if (existingZone.planPosY !== undefined) target.planPosY = existingZone.planPosY;
    if (existingZone.id) target.id = existingZone.id;

    target.measurementLevels.sort((a, b) => a.level - b.level);
  }

  return deduplicateStorageArtifactLevels(
    Array.from(zoneByNumber.values()).sort((a, b) => a.zoneNumber - b.zoneNumber)
  );
}
