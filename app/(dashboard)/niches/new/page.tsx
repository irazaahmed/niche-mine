import { createNiche } from "@/lib/niches/actions";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

// Small starter list — Ahrefs' own country picker is far larger, but the
// workflow only needs "which country was this research run against" for
// bookkeeping, not a full ISO-3166 dataset.
const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Pakistan",
  "India", "Germany", "France", "United Arab Emirates", "Saudi Arabia",
  "Netherlands", "Spain", "Italy", "Brazil", "Mexico", "Global / Worldwide",
];

export default function NewNichePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Start new niche research</h1>
        <p className="mt-1 text-sm text-muted">Pick the country you&rsquo;ll target in Ahrefs for this research run.</p>
      </div>

      <Card>
        <form action={createNiche} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="country">Target country</Label>
            <Select id="country" name="country" required defaultValue="">
              <option value="" disabled>
                Select a country
              </option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="primary" type="submit">
            Create niche
          </Button>
        </form>
      </Card>
    </div>
  );
}
