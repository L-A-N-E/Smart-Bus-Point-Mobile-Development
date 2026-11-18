// CO2 evitado por optar pelo ônibus em vez do carro — constantes aproximadas, a validar com
// fonte oficial (ex.: Ministério do Meio Ambiente / EPA) antes de qualquer uso além de demonstração.
// Carro: ~192 g CO2/km/passageiro (ocupação média baixa). Ônibus: ~80 g CO2/km/passageiro (SPTrans,
// aproximação considerando ocupação média de uma linha urbana).
const CAR_G_PER_KM = 192;
const BUS_G_PER_KM = 80;

export function co2SavedGrams(rideDistanceKm: number): number {
  return Math.round(Math.max(0, rideDistanceKm) * (CAR_G_PER_KM - BUS_G_PER_KM));
}
