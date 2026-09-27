// Lists every notice that reached any vehicle, with the code-side field check beside it.
// Used to read the results by eye before publishing.
import { VEHICLES, vehicleTitle } from "../src/data/vehicles";
import { fieldCheck } from "../src/lib/home";
import { load, VERDICTS } from "../src/lib/site";

const { site, events } = load();
let total = 0;
let unnamed = 0;
for (const v of VEHICLES) {
  site.cells[v.id].forEach((c, i) => {
    if (!c || c[5] === 0) return;
    total++;
    const e = events[i];
    const k = fieldCheck(v, e);
    const named = k.modelNamed ? `model named, year ${k.year}` : k.makeNamed ? "make only" : "MAKE NOT NAMED";
    if (!k.modelNamed) unnamed++;
    console.log(
      `${vehicleTitle(v).padEnd(30)} ${VERDICTS[c[5]].padEnd(9)} rel ${String(c[0]).padStart(3)} att ${String(c[1]).padStart(3)} int ${String(c[2]).padStart(3)} | ${named.padEnd(28)} | ${e.id.replace("nhtsa-", "")} ${e.text.slice(0, 90)}`,
    );
  });
}
console.log(`\n${total} notices reached a vehicle; ${unnamed} of them without NHTSA naming the vehicle's model`);

// The other direction: NHTSA names make, model and year, and Jev still ignored it.
let missed = 0;
for (const v of VEHICLES) {
  site.cells[v.id].forEach((c, i) => {
    if (!c || c[5] !== 0) return;
    const k = fieldCheck(v, events[i]);
    if (k.modelNamed && k.year === "listed") {
      missed++;
      console.log(`IGNORED though named: ${vehicleTitle(v)} rel ${c[0]} att ${c[1]} int ${c[2]} | ${events[i].id} ${events[i].text.slice(0, 100)}`);
    }
  });
}
console.log(`${missed} notices ignored although NHTSA names the vehicle's make, model and year`);
