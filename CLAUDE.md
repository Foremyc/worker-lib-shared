# worker-lib-shared

Libreria condivisa dei worker: costanti dell'indice, finestre stagionali, helper eventi e worker_runs.

## Documentazione

La documentazione di Foremyc vive nel repo **wiki**, clonato accanto a questo. Punto di
ingresso: [Guida per l'IA](../wiki/13-guida-per-ia.md).

Pagina di questo componente: [06-tools/libreria-condivisa.md](../wiki/06-tools/libreria-condivisa.md)

Se la cartella `../wiki` non c'è, clonala: `git clone https://github.com/Foremyc/wiki`

## Comandi

```bash
npm test
npm run typecheck
```

## Da sapere

Non è deployabile. Le formule NON stanno qui, solo le costanti. `src/runs.ts` (`withWorkerRun`) non è documentato nel README ma è usato da W1, W2 e W7.

## La wiki si aggiorna insieme al codice

Prima di modificare qualcosa, leggi [06-tools/libreria-condivisa.md](../wiki/06-tools/libreria-condivisa.md): contiene decisioni e trappole
che dal codice non si vedono.

**Chi cambia il comportamento aggiorna quella pagina nello stesso commit**, non dopo. Una wiki
che descrive un comportamento che non esiste più è peggio di una wiki mancante, perché chi la
legge ci costruisce sopra. Se codice e wiki divergono, **vince il codice**: si corregge la wiki.

Dove va cosa:

| Cosa hai | Dove si scrive |
| --- | --- |
| Un cambio di comportamento | la pagina di questo componente |
| Una decisione e il suo perché | la pagina interessata, più una riga in [`00-timeline.md`](../wiki/00-timeline.md) se è una svolta |
| Una trappola che ti ha fatto perdere tempo | ["Trappole note" in `13-guida-per-ia.md`](../wiki/13-guida-per-ia.md) |
| Una domanda senza risposta | [`domande-aperte.md`](../wiki/domande-aperte.md), e solo lì |
| Un valore di credenziale | da nessuna parte in nessun repo. Vedi [`12-secrets.md`](../wiki/12-secrets.md) |

Regole complete, stile compreso: [`CONTRIBUTING.md`](../wiki/CONTRIBUTING.md).
