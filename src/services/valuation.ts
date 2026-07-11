export const VEHICLE_BASE_VALUES: Record<string, number> = {
  'Cadillac': 82000, 'Lincoln': 72000, 'Land Rover': 85000, 'Range Rover': 105000,
  'Mercedes-Benz': 68000, 'Mercedes': 68000, 'BMW': 65000, 'Audi': 58000,
  'Lexus': 62000, 'Acura': 52000, 'Infiniti': 52000, 'Genesis': 58000,
  'Volvo': 60000, 'Porsche': 90000, 'Jaguar': 62000, 'Bentley': 200000,
  'Rolls-Royce': 350000, 'Maserati': 85000, 'Tesla': 55000, 'Alfa Romeo': 52000,
  'Ford': 42000, 'Chevrolet': 41000, 'Chevy': 41000, 'GMC': 45000,
  'Ram': 43000, 'Toyota': 42000, 'Nissan': 39000, 'Honda': 39000,
  'Hyundai': 38000, 'Kia': 37000, 'Jeep': 42000, 'Subaru': 36000,
  'Volkswagen': 38000, 'VW': 38000, 'Mazda': 36000, 'Mitsubishi': 32000,
  'Chrysler': 36000, 'Buick': 38000, 'Dodge': 38000, 'Mini': 35000,
  'Fiat': 25000, 'Hummer': 65000, 'Pontiac': 28000, 'Saturn': 24000,
  'Mercury': 28000, 'Oldsmobile': 26000,
};

const TRIM_ADJ: Record<string, number> = {
  'Premium Luxury': 12000, 'Sport': 15000, 'Premium Luxury Platinum': 30000, 'Sport Platinum': 30000,
  'V-Series': 72000, 'V': 72000, 'xDrive40i': 8000, 'xDrive50i': 18000, 'M50i': 25000, 'M': 35000,
  '350': 5000, '450': 12000, '580': 25000, 'AMG': 40000, 'XL': 0, 'XLT': 12000, 'Lariat': 28000,
  'King Ranch': 38000, 'Platinum': 42000, 'Raptor': 45000, 'Tremor': 20000, 'WT': 0, 'Custom': 5000,
  'LT': 10000, 'LTZ': 25000, 'High Country': 35000, 'Denali': 32000, 'AT4': 22000, 'AT4X': 35000,
  'Denali Ultimate': 50000, 'Tradesman': 0, 'Big Horn': 10000, 'Laramie': 22000, 'Rebel': 15000,
  'TRX': 55000, 'SR': 0, 'SR5': 8000, 'TRD Sport': 12000, 'TRD Off-Road': 15000, 'TRD Pro': 25000,
  'Capstone': 35000, 'Sahara': 12000, 'Rubicon': 18000, 'High Altitude': 25000, 'Premium': 5000,
  'F Sport': 8000, 'Ultra Luxury': 18000, 'F': 30000, 'S': 15000, 'GTS': 25000, 'Turbo': 50000,
  'Turbo S': 80000, 'Base': 0,
};

function getBase(make: string): number {
  if (VEHICLE_BASE_VALUES[make]) return VEHICLE_BASE_VALUES[make];
  const u = make.toUpperCase();
  for (const [k, v] of Object.entries(VEHICLE_BASE_VALUES)) if (k.toUpperCase() === u) return v;
  for (const [k, v] of Object.entries(VEHICLE_BASE_VALUES)) if (u.includes(k.toUpperCase()) || k.toUpperCase().includes(u)) return v;
  return 40000;
}
function getTrimAdj(trim: string): number {
  if (!trim || trim === 'Base') return 0;
  if (TRIM_ADJ[trim]) return TRIM_ADJ[trim];
  const u = trim.toUpperCase();
  for (const [k, v] of Object.entries(TRIM_ADJ)) if (u.includes(k.toUpperCase())) return v;
  return 0;
}

export function calculateValue(make: string, year: number, mileage: number, trim?: string): { clean: number; rebuilt: number } {
  const age = Math.max(0, new Date().getFullYear() - year);
  let base = getBase(make) + getTrimAdj(trim || '');
  let df = 1;
  if (age >= 1) df *= 0.75; if (age >= 2) df *= 0.85; if (age >= 3) df *= 0.88;
  for (let i = 3; i < age; i++) df *= 0.90;
  let dv = Math.round(base * df);
  const em = Math.max(1, age * 12000);
  const am = mileage || em;
  const ratio = am / em;
  let mf: number;
  if (ratio <= 0.5) mf = 1.15; else if (ratio <= 0.8) mf = 1.08; else if (ratio <= 1.0) mf = 1.0;
  else if (ratio <= 1.3) mf = 0.88; else if (ratio <= 1.7) mf = 0.75; else if (ratio <= 2.5) mf = 0.62; else mf = 0.50;
  const clean = Math.round(dv * mf);
  const luxury = ['Cadillac','Lincoln','Mercedes','BMW','Audi','Lexus','Acura','Infiniti','Genesis','Volvo','Porsche','Jaguar','Land Rover','Range Rover','Tesla','Bentley','Rolls-Royce','Maserati','Ferrari','Lamborghini','McLaren','Aston Martin'].some(l => make.toLowerCase().includes(l.toLowerCase()));
  return { clean, rebuilt: Math.round(clean * (luxury ? 0.58 : 0.68)) };
}
