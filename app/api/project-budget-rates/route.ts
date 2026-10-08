export const revalidate = 3600;

type FrankfurterRates = {
  date: string;
  rates?: { USD?: number; IDR?: number };
};

export async function GET() {
  try {
    const response = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,IDR", {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return Response.json({ error: "Les taux de change sont indisponibles." }, { status: 502 });

    const data = await response.json() as FrankfurterRates;
    const eurUsd = data.rates?.USD;
    const eurIdr = data.rates?.IDR;
    if (!data.date || !eurUsd || !eurIdr || !Number.isFinite(eurUsd) || !Number.isFinite(eurIdr)) {
      return Response.json({ error: "La réponse des taux de change est invalide." }, { status: 502 });
    }

    return Response.json({
      date: data.date,
      eurUsd,
      eurIdr,
      usdIdr: eurIdr / eurUsd,
      source: "Frankfurter · taux de référence BCE",
    });
  } catch {
    return Response.json({ error: "Impossible de récupérer les taux de change." }, { status: 502 });
  }
}