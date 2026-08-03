# Contributing to BioLab Play

The unusual thing about this project is that a pull request has to survive a
**scientific** review, not only a code review. What follows is that review,
written down, so you can run it on yourself before anyone else sees the change.

---

## The one rule

**Say what you cannot conclude.**

Every station carries a scientific contract, and its `cannotConclude` field is
not a disclaimer. It is the field that catches overclaiming before it ships.
Every scientific error found in review of this project so far, without exception,
would have been caught by filling it in honestly first:

- muscle activation described as showing "how hard" a muscle works, when every
  muscle is normalised to its own peak and the height is timing
- ground reaction force described as showing how a joint is loaded, when it is an
  external force and the joint moment needs inverse dynamics
- a single-leg squat described as a screening test, when the association is
  population-dependent and does not predict injury in an individual
- markerless capture described as giving "the same angles a lab would", when
  agreement is plane-dependent
- a toy tensegrity rig described as if its behaviour told you something about a
  real body

If you cannot write a specific, non-generic `cannotConclude` for what you are
adding, you do not yet understand it well enough to teach it.

---

## Before you open a pull request

```bash
npm test                        # 700+ scientific assertions, must be green
node scripts/gen_readme.mjs     # if you touched stations.js
```

The test suite is not about UI. It asserts things that must be true for the site
to be honest, so that a commit changing an animation cannot quietly change the
physiology. If your change makes a test fail, the first question is not "how do I
loosen the test" but "is the test right and am I wrong".

That has happened repeatedly here, and going the other way has been correct every
time. Examples from this repo's history:

- a test flagged joint angles as out of range; the limit was wrong, because ankle
  plantarflexion at a jump take-off legitimately passes 40 degrees
- a test flagged curves for not reaching 100% of the cycle; the test was wrong,
  because the curves are cyclic and wrap
- a test flagged the ground reaction force going negative; **the test was right**,
  and it found genuine interpolation overshoot that only a clamp was hiding

---

## Adding a station

1. Add an entry to [`stations.js`](stations.js) with a complete contract. The
   test suite will reject an empty `cannotConclude` or a missing translation.
2. Create `yourstation.html`, `.css`, `.js`. Copy the script order from an
   existing page: `i18n.js`, `stations.js`, `nav.js`, your script,
   `contract-panel.js`, `abbr.js`. **`stations.js` must load before `nav.js`.**
3. Add Polish for every `data-i18n` key to [`i18n.js`](i18n.js).
4. Bump the `?v=` cache version across all HTML files.
5. Regenerate the README.

You do not need to touch the navigation. It is generated from the catalogue.

### The shape of a station

Newer stations follow: **predict, play, observe, explain, evidence, break it.**

The last one is the signature. Give the reader controls that produce a
convincing-looking wrong answer, and then say so. Set a filter cutoff to 100 Hz.
Move the centre of pressure five centimetres. Choose an MVC reference that was
never measured. A plausible-looking curve is not evidence that the processing was
appropriate, and that is easier to learn by doing it than by being told.

---

## Adding data

**Open access is not the same as redistributable.** Check the licence separately,
every time.

- Prefer to **cite and link**, computing derived summary curves rather than
  committing the source data.
- If you must redistribute, the licence has to permit it, and you must add an
  attribution file next to the data. See
  [`data/emg/LICENSE_DATA.md`](data/emg/LICENSE_DATA.md) for the expected form:
  attribution, exactly what was taken, exactly what was done to it, how to
  reproduce it, and how you verified it is what you say it is.
- Commit the extraction script. A committed data file that nobody can regenerate
  is a data file nobody can check.
- Watch for share-alike. This project chose Santuz 2021 (CC BY 4.0) over the more
  obvious Santuz 2018 (CC BY-SA 4.0) for exactly this reason.

---

## Claims about other people's methods

If a page says it implements a published method, **test it against that method**,
and put the test in the suite.

The EMG Lab is the worked example. It says it runs the Santuz filter, so
`tests/science.test.mjs` checks the browser's own filter two independent ways:
sample by sample against `scipy.signal.butter(4)` + `filtfilt` over the same
recording, and against the closed-form Butterworth magnitude response, which
depends on no implementation at all.

The second test earned its place. An earlier version used a 2nd-order section run
forward and backward and called it "effectively fourth order". It is not: the
magnitude responses differ by roughly fifteenfold half an octave inside a 50 Hz
high-pass. Looking reasonable was not enough, and it should not have been.

If you cannot test a claim, weaken the claim. "Implements the X pipeline" becomes
"a teaching implementation using X's published settings".

---

## Writing

- **English and Polish**, both, including hover citations and contracts.
- **No em-dashes.** There are none in the repository and the intent is to keep it
  that way.
- Avoid the constructions that read as machine-written: "not just X but Y",
  "A rather than B" as a mannerism, "it's not about X, it's about Y".
- Short sentences. Full stops instead of dramatic pauses.
- Quotations from papers are verbatim, in quotation marks, with page numbers.
  Where a page shows a translated quotation, show the original underneath.
- Never invent a citation. If you cannot read the source, do not cite it. If a
  claim needs a reference you have not verified, write the claim without numbers
  and say the reference is unverified.

---

## Not planned

Accounts, logins, progress tracking, points, badges, leaderboards, certificates,
an LMS, a backend, analytics. The static, open, no-signup character is a feature.
A pull request adding any of these will be declined with thanks.

---

## Reporting a scientific error

Open an issue titled `Scientific: <page> <what is wrong>`. Include what the page
claims, why it is wrong, and a source if you have one. Corrections of this kind
get priority over features, and there is no such thing as too small.

If you are a student who read something here and found it misleading, that is
exactly the report this project most wants.
