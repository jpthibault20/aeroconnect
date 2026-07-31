/**
 * Conversion « instant réel » → « heure de pendule du club ».
 *
 * Les créneaux sont stockés en *wall-clock UTC* : une séance saisie à 14:00 est
 * écrite `T14:00:00.000Z`, quelle que soit la saison (cf. setUTCHours dans
 * api/db/sessions.ts, et la convention de lecture UTC de dateServeur.ts).
 *
 * Conséquence : comparer un créneau à `new Date()` est FAUX. En France l'été
 * (UTC+2), à 16:00 réelles l'instant courant vaut 14:00Z, donc un créneau de
 * 15:00 — commencé il y a une heure — passe encore pour « futur ». Le décalage
 * vaut l'offset du fuseau, soit jusqu'à 2 heures pendant lesquelles un créneau
 * dépassé reste réservable.
 *
 * `toClubWallClock` ramène l'instant courant dans le même référentiel que les
 * créneaux : les deux se comparent alors directement.
 */

// Fuseau de référence des clubs. L'application est francophone et mono-fuseau ;
// le jour où un club hors métropole arrive, ce fuseau devra devenir une colonne
// de `Club` et être passé en paramètre (la fonction ci-dessous l'accepte déjà).
export const CLUB_TIME_ZONE = "Europe/Paris";

/**
 * Renvoie l'instant dont les composantes UTC valent l'heure de pendule de
 * `timeZone` à `instant`. Autrement dit : la même valeur que celle qu'aurait un
 * créneau créé « maintenant » dans le club.
 */
export function toClubWallClock(instant: Date, timeZone: string = CLUB_TIME_ZONE): Date {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        // h23 (et non hour12: false) : certains moteurs rendent « 24 » pour
        // minuit avec hour12: false, ce qui décalerait d'un jour.
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(instant);

    const part = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((p) => p.type === type)?.value);

    return new Date(
        Date.UTC(
            part("year"),
            part("month") - 1,
            part("day"),
            part("hour"),
            part("minute"),
            part("second")
        )
    );
}
