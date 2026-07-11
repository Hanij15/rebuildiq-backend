export async function decodeVin(vin: string): Promise<Record<string, string>> {
  const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
  const data = await res.json();
  const results: Array<{ Variable: string; Value: string | null }> = data.Results;
  const get = (n: string) => results.find(r => r.Variable === n)?.Value || '';
  return { year: get('Model Year'), make: get('Make'), model: get('Model'), trim: get('Trim'), engine: get('Engine Model'), cylinders: get('Engine Number of Cylinders'), displacement: get('Displacement (L)'), transmission: get('Transmission Style'), drivetrain: get('Drive Type'), bodyClass: get('Body Class'), fuelType: get('Fuel Type - Primary'), doors: get('Doors'), manufacturer: get('Manufacturer Name'), plant: get('Plant City') };
}
