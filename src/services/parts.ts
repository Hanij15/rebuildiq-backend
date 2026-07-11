import { PARTS_CATALOG } from './partsCatalog.js';
export interface PartListing { id: string; partName: string; supplier: string; price: number; shipping: number; condition: string; url: string; category: string; }
function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; } return Math.abs(h); }
function rand(seed: number): number { const x = Math.sin(seed) * 10000; return x - Math.floor(x); }
export function searchParts(partName: string, year: number, make: string, model: string): { usedOem: PartListing[]; newOem: PartListing[]; aftermarket: PartListing[] } {
  const q = encodeURIComponent(`${year} ${make} ${model} ${partName}`);
  const pn = encodeURIComponent(partName);
  const base = PARTS_CATALOG[Object.keys(PARTS_CATALOG).find(k => partName.toLowerCase().includes(PARTS_CATALOG[k].name.toLowerCase())) || 'hood']?.price || 200;
  const usedOem: PartListing[] = [
    { id: `u1_${partName}`, partName, supplier: 'eBay', price: Math.round(base * (0.4 + rand(hash(partName + 'ebay')) * 0.3)), shipping: Math.round(25 + rand(hash(partName + 'ship1')) * 20), condition: 'OEM Used - Good', url: `https://www.ebay.com/sch/i.html?_nkw=${q}`, category: 'used_oem' },
    { id: `u2_${partName}`, partName, supplier: 'Car-Part.com', price: Math.round(base * (0.35 + rand(hash(partName + 'car')) * 0.25)), shipping: Math.round(30 + rand(hash(partName + 'ship2')) * 15), condition: 'OEM Used - Fair', url: `https://www.car-part.com/cgi-bin/search.cgi?search=${pn}`, category: 'used_oem' },
    { id: `u3_${partName}`, partName, supplier: 'LKQ', price: Math.round(base * (0.45 + rand(hash(partName + 'lkq')) * 0.2)), shipping: Math.round(35 + rand(hash(partName + 'ship3')) * 10), condition: 'OEM Used - Excellent', url: `https://www.lkqcorp.com/search?q=${pn}`, category: 'used_oem' },
  ];
  const newOem: PartListing[] = [
    { id: `n1_${partName}`, partName, supplier: 'RockAuto', price: Math.round(base * (1.0 + rand(hash(partName + 'rock')) * 0.5)), shipping: Math.round(12 + rand(hash(partName + 'ns1')) * 15), condition: 'New OEM', url: `https://www.rockauto.com/en/partsearch/?searchpart=${pn}`, category: 'new_oem' },
    { id: `n2_${partName}`, partName, supplier: 'Dealer', price: Math.round(base * (1.2 + rand(hash(partName + 'dealer')) * 0.3)), shipping: Math.round(15 + rand(hash(partName + 'ns2')) * 20), condition: 'New OEM - Genuine', url: `https://www.google.com/search?q=${q}+OEM+dealer+parts`, category: 'new_oem' },
  ];
  const aftermarket: PartListing[] = [
    { id: `a1_${partName}`, partName, supplier: 'RockAuto', price: Math.round(base * (0.5 + rand(hash(partName + 'ra')) * 0.4)), shipping: Math.round(10 + rand(hash(partName + 'as1')) * 15), condition: 'New Aftermarket', url: `https://www.rockauto.com/en/partsearch/?searchpart=${pn}`, category: 'aftermarket' },
    { id: `a2_${partName}`, partName, supplier: 'Amazon', price: Math.round(base * (0.55 + rand(hash(partName + 'amz')) * 0.35)), shipping: Math.round(8 + rand(hash(partName + 'as2')) * 12), condition: 'New Aftermarket', url: `https://www.amazon.com/s?k=${q}+automotive+parts`, category: 'aftermarket' },
    { id: `a3_${partName}`, partName, supplier: 'eBay', price: Math.round(base * (0.45 + rand(hash(partName + 'ae')) * 0.35)), shipping: Math.round(12 + rand(hash(partName + 'as3')) * 18), condition: 'New Aftermarket', url: `https://www.ebay.com/sch/i.html?_nkw=${q}+aftermarket`, category: 'aftermarket' },
  ];
  return { usedOem, newOem, aftermarket };
}
