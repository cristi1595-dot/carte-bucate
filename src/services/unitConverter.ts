// Unit Converter for Recipe Ingredients (Metric <-> Imperial / US)

export type UnitSystem = 'original' | 'metric' | 'imperial';

// Common units normalized
const METRIC_VOLUME_UNITS = ['ml', 'l', 'mililitri', 'litru', 'litri', 'dl', 'cl'];
const METRIC_WEIGHT_UNITS = ['g', 'gr', 'gram', 'grame', 'kg', 'kilogram', 'kilograme'];

const IMPERIAL_VOLUME_UNITS = ['cup', 'cups', 'cană', 'căni', 'tbsp', 'tablespoon', 'tablespoons', 'lingură', 'linguri', 'tsp', 'teaspoon', 'teaspoons', 'linguriță', 'lingurițe', 'fl oz', 'fluid ounce', 'fluid ounces', 'pint', 'pints', 'quart', 'quarts', 'gallon', 'gallons'];
const IMPERIAL_WEIGHT_UNITS = ['oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds'];

export function normalizeUnit(unit: string): string {
  return (unit || '').toLowerCase().trim().replace(/\.$/, '');
}

/**
 * Converts an ingredient amount and unit according to the selected system.
 */
export function convertIngredientUnit(
  amount: number | null,
  unit: string,
  targetSystem: UnitSystem
): { amount: number | null; unit: string; displayText: string } {
  if (amount === null || amount === undefined || !unit || targetSystem === 'original') {
    const amtStr = amount !== null && amount !== undefined ? `${Math.round(amount * 100) / 100}` : '';
    return {
      amount,
      unit,
      displayText: `${amtStr} ${unit}`.trim(),
    };
  }

  const norm = normalizeUnit(unit);

  if (targetSystem === 'metric') {
    // Already metric?
    if (METRIC_VOLUME_UNITS.includes(norm) || METRIC_WEIGHT_UNITS.includes(norm)) {
      return formatMetricDisplay(amount, norm);
    }

    // Imperial to Metric
    switch (norm) {
      case 'cup':
      case 'cups':
      case 'cană':
      case 'căni':
        return formatMetricDisplay(amount * 240, 'ml');
      case 'tbsp':
      case 'tablespoon':
      case 'tablespoons':
      case 'lingură':
      case 'linguri':
        return formatMetricDisplay(amount * 15, 'ml');
      case 'tsp':
      case 'teaspoon':
      case 'teaspoons':
      case 'linguriță':
      case 'lingurițe':
        return formatMetricDisplay(amount * 5, 'ml');
      case 'fl oz':
      case 'fluid ounce':
      case 'fluid ounces':
        return formatMetricDisplay(amount * 29.57, 'ml');
      case 'oz':
      case 'ounce':
      case 'ounces':
        return formatMetricDisplay(amount * 28.35, 'g');
      case 'lb':
      case 'lbs':
      case 'pound':
      case 'pounds':
        return formatMetricDisplay(amount * 453.59, 'g');
      case 'pint':
      case 'pints':
        return formatMetricDisplay(amount * 473.18, 'ml');
      case 'quart':
      case 'quarts':
        return formatMetricDisplay(amount * 946.35, 'ml');
      default:
        // Unknown or count unit (buc, căței, legătură) -> keep as is
        return {
          amount,
          unit,
          displayText: `${Math.round(amount * 100) / 100} ${unit}`.trim(),
        };
    }
  }

  if (targetSystem === 'imperial') {
    // Already imperial?
    if (IMPERIAL_VOLUME_UNITS.includes(norm) || IMPERIAL_WEIGHT_UNITS.includes(norm)) {
      return {
        amount: Math.round(amount * 100) / 100,
        unit,
        displayText: `${formatFraction(amount)} ${unit}`.trim(),
      };
    }

    // Metric to Imperial
    if (norm === 'g' || norm === 'gr' || norm === 'gram' || norm === 'grame') {
      if (amount >= 450) {
        const lbs = amount / 453.59;
        return {
          amount: Math.round(lbs * 10) / 10,
          unit: 'lb',
          displayText: `${Math.round(lbs * 10) / 10} lb`,
        };
      }
      const oz = amount / 28.35;
      return {
        amount: Math.round(oz * 10) / 10,
        unit: 'oz',
        displayText: `${Math.round(oz * 10) / 10} oz`,
      };
    }

    if (norm === 'kg' || norm === 'kilogram' || norm === 'kilograme') {
      const lbs = amount * 2.20462;
      return {
        amount: Math.round(lbs * 10) / 10,
        unit: 'lb',
        displayText: `${Math.round(lbs * 10) / 10} lb`,
      };
    }

    if (norm === 'ml' || norm === 'mililitri') {
      if (amount >= 120) {
        const cups = amount / 240;
        return {
          amount: Math.round(cups * 100) / 100,
          unit: 'cups',
          displayText: `${formatFraction(cups)} cups`,
        };
      } else if (amount >= 15) {
        const tbsp = amount / 15;
        return {
          amount: Math.round(tbsp * 10) / 10,
          unit: 'tbsp',
          displayText: `${Math.round(tbsp * 10) / 10} tbsp`,
        };
      } else {
        const tsp = amount / 5;
        return {
          amount: Math.round(tsp * 10) / 10,
          unit: 'tsp',
          displayText: `${Math.round(tsp * 10) / 10} tsp`,
        };
      }
    }

    if (norm === 'l' || norm === 'litru' || norm === 'litri') {
      const cups = (amount * 1000) / 240;
      return {
        amount: Math.round(cups * 10) / 10,
        unit: 'cups',
        displayText: `${Math.round(cups * 10) / 10} cups`,
      };
    }

    // Default for items without volume/weight (e.g. buc, ouă)
    return {
      amount,
      unit,
      displayText: `${Math.round(amount * 100) / 100} ${unit}`.trim(),
    };
  }

  return { amount, unit, displayText: `${amount} ${unit}`.trim() };
}

function formatMetricDisplay(val: number, unit: string): { amount: number; unit: string; displayText: string } {
  if (unit === 'g' && val >= 1000) {
    const kg = Math.round((val / 1000) * 10) / 10;
    return { amount: kg, unit: 'kg', displayText: `${kg} kg` };
  }
  if (unit === 'ml' && val >= 1000) {
    const l = Math.round((val / 1000) * 10) / 10;
    return { amount: l, unit: 'l', displayText: `${l} l` };
  }
  const rounded = Math.round(val);
  return {
    amount: rounded,
    unit,
    displayText: `${rounded} ${unit}`,
  };
}

/**
 * Format decimal numbers into common culinary fractions for US system (e.g. 0.5 -> 1/2)
 */
function formatFraction(val: number): string {
  const whole = Math.floor(val);
  const remainder = val - whole;

  let fraction = '';
  if (remainder >= 0.18 && remainder < 0.3) fraction = '1/4';
  else if (remainder >= 0.3 && remainder < 0.4) fraction = '1/3';
  else if (remainder >= 0.4 && remainder < 0.6) fraction = '1/2';
  else if (remainder >= 0.6 && remainder < 0.7) fraction = '2/3';
  else if (remainder >= 0.7 && remainder < 0.85) fraction = '3/4';
  else if (remainder >= 0.85) return `${whole + 1}`;

  if (fraction && whole > 0) return `${whole} ${fraction}`;
  if (fraction) return fraction;
  return `${Math.round(val * 10) / 10}`;
}
