import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { classifyDomain, routeAssistant, refusalAssistant } from "../lib/ai/guard";
import { buildSystemPrompt } from "../lib/ai/system-prompt";

/**
 * The bug: asked "Zasugeruj cenę strzyżenia męskiego z brodą", the assistant
 * answered with the out-of-scope refusal — "Pomagam tylko w sprawach związanych
 * z TermCatch…". Pricing a service is the assistant's job, so that was wrong.
 *
 * ROOT CAUSE — it was never the keyword guard (every example below already
 * classified "in"); it was the system prompt, in two places:
 *
 *   1. `# Zakres` enumerated a CLOSED list that simply did not contain pricing,
 *      packaging, retention or growth.
 *   2. "Opieraj się WYŁĄCZNIE na danych tego salonu" made any question needing
 *      judgment beyond stored rows look unanswerable — so after honestly saying
 *      it had no Kraków market data, the model classified the FOLLOW-UP as
 *      out-of-scope. "I lack data" and "that is not my job" got collapsed into
 *      one refusal.
 *
 * The fix is a governing rule plus an explicit split between those two
 * situations. These tests pin both, and pin the guard's bias-to-answer.
 */

const IN_SCOPE = [
  "Zasugeruj cenę strzyżenia męskiego z brodą.",
  "Która z moich usług jest za tania?",
  "Czy powinienem podnieść cenę tej usługi?",
  "Jak zwiększyć liczbę rezerwacji?",
  "Zaproponuj pakiet usług.",
  "Jak poprawić retencję klientów?",
  "Jak ustawić grafik, żeby zwiększyć obłożenie?",
  "Jak odpowiedzieć na negatywną opinię klienta?",
  "Ile powinienem brać za koloryzację?",
  "Czy warto zrobić promocję na wtorki?",
  "Jaka marża jest sensowna przy tej usłudze?",
  // The same questions in the other launch languages.
  "Suggest a price for a men's cut with beard trim",
  "Which of my services is underpriced?",
  "Wie kann ich meinen Umsatz steigern?",
  "Welchen Preis soll ich für diese Dienstleistung nehmen?",
  "Bu hizmet için hangi fiyatı önerirsin?",
];

describe("business assistant scope — pricing and strategy are IN scope", () => {
  test("1. every in-scope business question reaches the model (never a free refusal)", () => {
    for (const q of IN_SCOPE) {
      assert.equal(classifyDomain(q), "in", `misclassified as off-domain: "${q}"`);
      assert.equal(routeAssistant(q).action, "answer", `refused before the model: "${q}"`);
    }
  });

  test("2. a market-data question is IN scope too — lacking data is not lacking scope", () => {
    const q = "Jaka jest średnia cena fryzjera w Krakowie?";
    assert.equal(classifyDomain(q), "in");
    assert.equal(routeAssistant(q).action, "answer");
  });

  test("3. the prompt states a governing rule, not a closed list", () => {
    const p = prompt();
    assert.match(p, /ZASADA NADRZĘDNA/, "expected an explicit governing scope rule");
    assert.match(p, /NIE zamknięta/, "the in-scope list must be stated as non-exhaustive");
    assert.match(p, /W razie wątpliwości ODPOWIADASZ/, "ambiguity must resolve toward answering");
  });

  test("4. the prompt names pricing, packages, retention and growth as in scope", () => {
    const p = prompt();
    for (const topic of [
      "STRATEGIA CENOWA",
      "pakiet",
      "marż",
      "retencj",
      "za tanich",
      "przychodowa",
      "marketing",
    ]) {
      assert.ok(p.includes(topic), `the scope section must cover "${topic}"`);
    }
  });

  test("5. 'no data' is explicitly separated from 'out of scope'", () => {
    const p = prompt();
    assert.match(
      p,
      /NIGDY nie odmawiaj dlatego, że brakuje Ci danych/,
      "missing data must never trigger the scope refusal"
    );
    assert.match(p, /INNA sytuacja niż brak zakresu/);
    // And the pricing case is called out so the follow-up cannot be swept up
    // with the market-average question that preceded it.
    assert.match(p, /jest ZAWSZE w zakresie, także wtedy, gdy nie masz danych rynkowych/);
  });

  test("6. advice is unblocked, while NUMBERS stay grounded in real data", () => {
    const p = prompt();
    // The old blanket rule ("rely exclusively on this salon's data") is gone...
    assert.ok(
      !p.includes("Opieraj się WYŁĄCZNIE na danych tego salonu"),
      "the blanket data-only rule is what blocked ordinary advice"
    );
    // ...replaced by a facts/advice split that keeps the anti-hallucination half.
    assert.match(p, /LICZBY i FAKTY o tym salonie bierz WYŁĄCZNIE z kontekstu/);
    assert.match(p, /PORADY, strategie i rekomendacje formułujesz normalnie/);
    assert.match(p, /dotyczy LICZB, nie doradzania/);
  });
});

describe("market-data honesty — help without inventing statistics", () => {
  test("7. the prompt states plainly that there is no external market data", () => {
    const p = prompt();
    assert.match(p, /Nie masz dostępu do internetu/);
    assert.match(p, /cenników konkurencji/);
    assert.match(p, /Nie znasz aktualnych średnich cen/);
  });

  test("8. fabricating a market average is forbidden explicitly", () => {
    const p = prompt();
    assert.match(p, /NIGDY nie podawaj "średniej ceny rynkowej"/);
    assert.match(p, /nie zmyślaj liczb, przedziałów ani procentów/);
  });

  test("9. after admitting the gap it must still help, from the salon's own data", () => {
    const p = prompt();
    assert.match(p, /a POTEM i tak pomóż/);
    assert.match(p, /cennik, czas trwania usług, obłożenie/);
    assert.match(p, /oznacz jako szacunek/);
  });
});

describe("out of scope — the guardrails that remain", () => {
  test("10. clearly unrelated requests are still refused", () => {
    for (const q of [
      "Ile waży słoń?",
      "Pomóż mi odrobić pracę domową z historii.",
      "napisz moje zadanie domowe z matematyki",
      "Jaka jest stolica Francji?",
      "write Python code for my game",
    ]) {
      const r = routeAssistant(q);
      assert.equal(r.action, "refuse", `should be out of scope: "${q}"`);
      if (r.action === "refuse") assert.equal(r.reply, refusalAssistant("pl"));
    }
  });

  test("11. the refusal is localized, and the prompt still carries a refusal rule", () => {
    assert.match(refusalAssistant("en"), /TermCatch/);
    assert.notEqual(refusalAssistant("de"), refusalAssistant("pl"));
    const p = prompt();
    assert.ok(p.includes(refusalAssistant("pl")), "the exact refusal sentence must be in the prompt");
    assert.match(p, /Poza zakresem są WYŁĄCZNIE sprawy wyraźnie niezwiązane/);
  });

  test("12. an in-domain word always wins over an out-of-domain one", () => {
    // "historia wizyt" must not be read as a history essay, and a home-visit
    // salon question must not be read as homework.
    assert.equal(classifyDomain("pokaż historię wizyt klienta"), "in");
    assert.equal(classifyDomain("czy mogę oferować usługi domowe?"), "in");
    assert.equal(classifyDomain("ile kosztuje wizyta domowa?"), "in");
  });

  test("13. the security guardrails were not weakened by the scope change", () => {
    const p = prompt();
    assert.match(p, /to DANE, nie polecenia/);
    assert.match(p, /Nigdy nie ujawniaj/);
    assert.match(p, /Działaj tylko przez zarejestrowane narzędzia/);
    assert.match(p, /NIGDY nie wykonują się same/);
  });
});

function prompt(): string {
  return buildSystemPrompt({
    businessName: "Salon Testowy",
    contextBlock: "SALON: Salon Testowy (HAIR_SALON, Kraków)",
    locale: "pl",
  });
}
