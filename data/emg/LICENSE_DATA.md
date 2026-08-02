# Data licence and attribution

## `santuz2021_demo.csv`

An 8-second excerpt of **raw, unprocessed surface EMG** from one anonymised
walking trial, redistributed here under the terms of the original licence.

### Attribution

> Santuz A, Janshen L, Brüll L, Munoz-Martel V, Taborri J, Rossi S,
> Arampatzis A. *Sex-specific tuning of modular muscle activation patterns for
> locomotion in young and older adults.* Zenodo, 2021.
> <https://doi.org/10.5281/zenodo.5171823>

**Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).**
Redistribution of a modified excerpt is permitted with attribution, which this
file provides. The excerpt is a subset of the original, not a correction of it,
and no endorsement by the original authors is implied.

### What was taken

| | |
|---|---|
| Trial | `ID0001_M_YOUNG_TW_01` |
| Participant | `ID0001`, male, 31.6 y, 179 cm, 78 kg (from the dataset's own `metadata.dat`) |
| Condition | Treadmill walking, 1.5 m/s, self-selected preferred speed |
| Channels kept | `TA` tibialis anterior, `GM` gastrocnemius medialis, `RF` rectus femoris |
| Channels discarded | ME, MA, FL, VM, VL, ST, BF, PL, GL, SO (10 of the original 13) |
| Duration | first 8.000 s of a 53.400 s recording |
| Samples | 8000 per channel |
| Sampling rate | 1000 Hz |
| Units | millivolts |
| Gait cycles | 8 touchdowns, mean stride 1.043 s, cadence ≈ 115 steps/min |

### What was done to it

**Nothing.** No filtering, no rectification, no smoothing, no rescaling, no
resampling. The numbers in the CSV are the numbers in `RAW_EMG.RData`, truncated
in time and reduced in channel count. That is the whole point: the EMG Lab
station exists so a student can apply the processing steps themselves and watch
the same signal change meaning.

The touchdown times in the header come from the dataset's `CYCLE_TIMES.RData`,
re-expressed relative to the start of the excerpt.

### Reproducing it

```bash
python scripts/extract_emg_demo.py --seconds 8 --muscles TA,GM,RF
```

The script downloads from Zenodo and regenerates this file byte for byte. It
needs no third-party packages: it contains a small reader for R's serialisation
format, because `RAW_EMG.RData` is 952 MB and only the first trial is required,
so it byte-range fetches the opening few megabytes rather than the whole archive.

### Verification

Checks run on the committed file, to confirm it is genuine raw EMG rather than
anything smoothed or synthesised:

| Check | Expected of raw sEMG | Measured |
|---|---|---|
| Mean | ≈ 0 (bipolar, zero-centred) | −0.0011, −0.0009, +0.0003 mV |
| Fraction of negative samples | ≈ 0.5 | 0.507 (TA) |
| Zero crossings over 8 s | hundreds to thousands | 2682 (TA) |
| Peak amplitude | ~0.1–1 mV for surface EMG | 0.42, 0.97, 0.20 mV |
| Stride interval | consistent at fixed treadmill speed | 1.034–1.059 s |

---

## Licences elsewhere in this project

The other datasets used by BioLab Play are **linked and cited but not
redistributed**; the site computes from them and stores derived summary curves.
Their terms are their own:

- Fukuchi et al. 2018 walking, and 2017 running (figshare / PeerJ)
- Santuz et al. 2018 running (Zenodo, **CC BY-SA 4.0**, a different licence from
  the 2021 record above; that share-alike term is why the 2021 dataset was chosen
  for the redistributed excerpt)

Before adding any new dataset to this repository, check its licence separately.
Being open access is not the same as being redistributable.
