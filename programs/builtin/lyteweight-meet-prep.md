---
id: lyteweight-meet-prep
name: "Lyteweight Meet Prep (17 weeks)"
author: Lyteweight
url: "https://github.com/barely-ai/Lyteweight"
shortDescription: "A 17-week raw powerlifting meet prep: hypertrophy, strength and peak blocks, top sets plus RPE-autoregulated back-off sets, 4 days a week with bench 3x/week."
isMultiweek: true
tags: []
frequency: 4
age: "more_than_year"
duration: "60-90"
goal: "strength"
---

A 17-week raw powerlifting meet prep. Start it 17 weeks before your meet, so week 17 is meet week. It runs a hypertrophy block, a strength block and a peak block, then meet week. Every competition lift uses one top set at a target RPE, then back-off sets whose weights adjust to how the top set felt.

<!-- more -->

## Program Structure

- Weeks 1-6: hypertrophy. Top sets of 6, back-offs of 6, more accessory volume. Week 6 is lighter.
- Weeks 7-12: strength. Top sets of 4 and 3. Week 12 is lighter.
- Weeks 13-16: peak. Doubles and singles at competition intensity.
- Week 17: meet week. Two short opener sessions, then the meet on Saturday.
- Bench is trained 3 times a week: two autoregulated sessions and one volume session. Squat and deadlift are each trained twice.

## How the Autoregulation Works

- Before you start, set your 1RM for Squat, Bench Press and Deadlift. The top set's weight comes from that 1RM and the RPE table.
- Log the RPE of the top set. The app estimates your 1RM for the day from the weight, reps and RPE.
- The back-off weights are then recalculated from that estimate. A top set that felt harder than planned makes the back-offs lighter. One that felt easier makes them heavier.
- After the workout, that estimate becomes the lift's 1RM, so next session's top set adjusts too.
- If you don't log an RPE, nothing changes: the back-offs stay at the planned weights.

## Starting Weights

Set the 1RM of each competition lift to your most recent true max. The first top sets are at RPE 7, so a slightly high 1RM is still safe.

```liftoscript
// **Hypertrophy block (weeks 1-6).** Build muscle and work capacity while the cut starts.
// * Top set at the target RPE, then back-off sets. Log the RPE of the top set honestly.
// * Week 6 is a lighter week.
# Week 1
## Day 1
// Template for the competition lifts: one top set, then back-off sets.
// After you log the top set's RPE, the back-off weights are recalculated from it with the RPE table.
// After the workout, the top set's estimated 1RM becomes the lift's 1RM, so the next top set starts from it.
topset / used: none / 1x5 @8+ (Top), 3x5 @7 (Backoff) / 180s / update: custom() {~
  if (setIndex == 1 && completedRPE[1] > 0 && completedReps[1] > 0) {
    var.e1rm = completedWeights[1] / rpeMultiplier(completedReps[1], completedRPE[1])
    for (var.i in weights) {
      if (var.i > 1) {
        weights[var.i] = roundWeight(var.e1rm * rpeMultiplier(reps[var.i], RPE[var.i]))
      }
    }
  }
~} / progress: custom() {~
  if (completedRPE[1] > 0 && completedReps[1] > 0) {
    rm1 = completedWeights[1] / rpeMultiplier(completedReps[1], completedRPE[1])
  }
~}

Squat / ...topset[1:1] / 1x6 @7+ (Top), 3x6 @6 (Backoff)
Bench Press / ...topset[1:1] / 1x6 @7+ (Top), 3x6 @6 (Backoff)
Bent Over Row[1-6] / 4x10 @8 / 90s
Back Extension[1-6] / 3x12 @8 / 60s
Hanging Leg Raise[1-6] / 3x12 / 60s

## Day 2
Deadlift / ...topset[1:1] / 1x6 @7+ (Top), 3x6 @6 (Backoff)
// Touch-and-go volume bench. Not autoregulated - just hit the RPE.
vol: Bench Press[1-6] / 4x8 @7 / 120s
Lat Pulldown[1-6] / 4x10 @8 / 90s
Leg Press[1-6] / 3x12 @8 / 90s

## Day 3
Bench Press / ...topset[1:1] / 1x6 @7+ (Top), 3x6 @6 (Backoff)
// 2-second pause in the hole.
pause: Squat[1-6] / 3x5 @7 / 180s
Seated Row[1-6] / 4x10 @8 / 90s
Triceps Pushdown[1-6] / 3x12 @8 / 60s

## Day 4
Romanian Deadlift[1-6] / 3x8 @7 / 120s
Overhead Press[1-6] / 4x8 @8 / 120s
Bench Press Close Grip[1-6] / 3x10 @8 / 90s
Lateral Raise[1-6] / 3x15 @8 / 60s
Face Pull[1-6] / 3x15 @8 / 60s


# Week 2
## Day 1
Squat / ...topset[1:1] / 1x6 @7.5+ (Top), 3x6 @6.5 (Backoff)
Bench Press / ...topset[1:1] / 1x6 @7.5+ (Top), 3x6 @6.5 (Backoff)

## Day 2
Deadlift / ...topset[1:1] / 1x6 @7.5+ (Top), 3x6 @6.5 (Backoff)

## Day 3
Bench Press / ...topset[1:1] / 1x6 @7.5+ (Top), 3x6 @6.5 (Backoff)

## Day 4


# Week 3
## Day 1
Squat / ...topset[1:1] / 1x6 @8+ (Top), 4x6 @7 (Backoff)
Bench Press / ...topset[1:1] / 1x6 @8+ (Top), 4x6 @7 (Backoff)

## Day 2
Deadlift / ...topset[1:1] / 1x6 @8+ (Top), 4x6 @7 (Backoff)

## Day 3
Bench Press / ...topset[1:1] / 1x6 @8+ (Top), 4x6 @7 (Backoff)

## Day 4


# Week 4
## Day 1
Squat / ...topset[1:1] / 1x6 @8.5+ (Top), 4x6 @7 (Backoff)
Bench Press / ...topset[1:1] / 1x6 @8.5+ (Top), 4x6 @7 (Backoff)

## Day 2
Deadlift / ...topset[1:1] / 1x6 @8.5+ (Top), 4x6 @7 (Backoff)

## Day 3
Bench Press / ...topset[1:1] / 1x6 @8.5+ (Top), 4x6 @7 (Backoff)

## Day 4


# Week 5
## Day 1
Squat / ...topset[1:1] / 1x6 @8.5+ (Top), 4x6 @7.5 (Backoff)
Bench Press / ...topset[1:1] / 1x6 @8.5+ (Top), 4x6 @7.5 (Backoff)

## Day 2
Deadlift / ...topset[1:1] / 1x6 @8.5+ (Top), 4x6 @7.5 (Backoff)

## Day 3
Bench Press / ...topset[1:1] / 1x6 @8.5+ (Top), 4x6 @7.5 (Backoff)

## Day 4


# Week 6
## Day 1
Squat / ...topset[1:1] / 1x5 @6.5+ (Top), 2x5 @6 (Backoff)
Bench Press / ...topset[1:1] / 1x5 @6.5+ (Top), 2x5 @6 (Backoff)

## Day 2
Deadlift / ...topset[1:1] / 1x5 @6.5+ (Top), 2x5 @6 (Backoff)

## Day 3
Bench Press / ...topset[1:1] / 1x5 @6.5+ (Top), 2x5 @6 (Backoff)

## Day 4


// **Strength block (weeks 7-12).** Fewer reps, heavier top sets, less accessory volume.
// * Week 12 is a lighter week.
# Week 7
## Day 1
Squat / ...topset[1:1] / 1x4 @7.5+ (Top), 3x4 @7 (Backoff)
Bench Press / ...topset[1:1] / 1x4 @7.5+ (Top), 3x4 @7 (Backoff)
Bent Over Row[7-12] / 3x8 @8 / 90s
Back Extension[7-12] / 3x10 @8 / 60s
Hanging Leg Raise[7-12] / 3x10 / 60s

## Day 2
Deadlift / ...topset[1:1] / 1x4 @7.5+ (Top), 3x4 @7 (Backoff)
// Touch-and-go volume bench. Not autoregulated - just hit the RPE.
vol: Bench Press[7-12] / 4x5 @7 / 150s
Lat Pulldown[7-12] / 3x8 @8 / 90s

## Day 3
Bench Press / ...topset[1:1] / 1x4 @7.5+ (Top), 3x4 @7 (Backoff)
// 2-second pause in the hole.
pause: Squat[7-12] / 3x3 @7.5 / 180s
Seated Row[7-12] / 3x8 @8 / 90s
Triceps Pushdown[7-12] / 3x10 @8 / 60s

## Day 4
Romanian Deadlift[7-12] / 3x6 @7 / 150s
Overhead Press[7-12] / 3x6 @8 / 120s
Bench Press Close Grip[7-12] / 3x6 @8 / 120s
Face Pull[7-12] / 3x15 @8 / 60s


# Week 8
## Day 1
Squat / ...topset[1:1] / 1x4 @8+ (Top), 3x4 @7 (Backoff)
Bench Press / ...topset[1:1] / 1x4 @8+ (Top), 3x4 @7 (Backoff)

## Day 2
Deadlift / ...topset[1:1] / 1x4 @8+ (Top), 3x4 @7 (Backoff)

## Day 3
Bench Press / ...topset[1:1] / 1x4 @8+ (Top), 3x4 @7 (Backoff)

## Day 4


# Week 9
## Day 1
Squat / ...topset[1:1] / 1x3 @8+ (Top), 4x3 @7.5 (Backoff)
Bench Press / ...topset[1:1] / 1x3 @8+ (Top), 4x3 @7.5 (Backoff)

## Day 2
Deadlift / ...topset[1:1] / 1x3 @8+ (Top), 4x3 @7.5 (Backoff)

## Day 3
Bench Press / ...topset[1:1] / 1x3 @8+ (Top), 4x3 @7.5 (Backoff)

## Day 4


# Week 10
## Day 1
Squat / ...topset[1:1] / 1x3 @8.5+ (Top), 4x3 @7.5 (Backoff)
Bench Press / ...topset[1:1] / 1x3 @8.5+ (Top), 4x3 @7.5 (Backoff)

## Day 2
Deadlift / ...topset[1:1] / 1x3 @8.5+ (Top), 4x3 @7.5 (Backoff)

## Day 3
Bench Press / ...topset[1:1] / 1x3 @8.5+ (Top), 4x3 @7.5 (Backoff)

## Day 4


# Week 11
## Day 1
Squat / ...topset[1:1] / 1x3 @9+ (Top), 3x3 @8 (Backoff)
Bench Press / ...topset[1:1] / 1x3 @9+ (Top), 3x3 @8 (Backoff)

## Day 2
Deadlift / ...topset[1:1] / 1x3 @9+ (Top), 3x3 @8 (Backoff)

## Day 3
Bench Press / ...topset[1:1] / 1x3 @9+ (Top), 3x3 @8 (Backoff)

## Day 4


# Week 12
## Day 1
Squat / ...topset[1:1] / 1x3 @7+ (Top), 2x3 @6.5 (Backoff)
Bench Press / ...topset[1:1] / 1x3 @7+ (Top), 2x3 @6.5 (Backoff)

## Day 2
Deadlift / ...topset[1:1] / 1x3 @7+ (Top), 2x3 @6.5 (Backoff)

## Day 3
Bench Press / ...topset[1:1] / 1x3 @7+ (Top), 2x3 @6.5 (Backoff)

## Day 4


// **Peak block (weeks 13-16).** Heavy singles and doubles to practice competition loads.
// * Week 16 has your heaviest single. Keep it at or under the target RPE.
# Week 13
## Day 1
Squat / ...topset[1:1] / 1x2 @8.5+ (Top), 3x3 @7 (Backoff)
Bench Press / ...topset[1:1] / 1x2 @8.5+ (Top), 3x3 @7 (Backoff)
Bent Over Row[13-16] / 3x6 @7 / 90s

## Day 2
Deadlift / ...topset[1:1] / 1x2 @8.5+ (Top), 3x3 @7 (Backoff)
// Touch-and-go volume bench. Not autoregulated - just hit the RPE.
vol: Bench Press[13-16] / 3x3 @7 / 150s
Lat Pulldown[13-16] / 3x8 @7 / 90s

## Day 3
Bench Press / ...topset[1:1] / 1x2 @8.5+ (Top), 3x3 @7 (Backoff)
// 2-second pause in the hole.
pause: Squat[13-16] / 2x2 @7 / 180s
Triceps Pushdown[13-16] / 2x10 @7 / 60s

## Day 4
Overhead Press[13-16] / 3x5 @7 / 120s
Face Pull[13-16] / 2x15 @7 / 60s


# Week 14
## Day 1
Squat / ...topset[1:1] / 1x1 @8+ (Top), 3x2 @7.5 (Backoff)
Bench Press / ...topset[1:1] / 1x1 @8+ (Top), 3x2 @7.5 (Backoff)

## Day 2
Deadlift / ...topset[1:1] / 1x1 @8+ (Top), 3x2 @7.5 (Backoff)

## Day 3
Bench Press / ...topset[1:1] / 1x1 @8+ (Top), 3x2 @7.5 (Backoff)

## Day 4


# Week 15
## Day 1
Squat / ...topset[1:1] / 1x1 @8.5+ (Top), 2x2 @7.5 (Backoff)
Bench Press / ...topset[1:1] / 1x1 @8.5+ (Top), 2x2 @7.5 (Backoff)

## Day 2
Deadlift / ...topset[1:1] / 1x1 @8.5+ (Top), 2x2 @7.5 (Backoff)

## Day 3
Bench Press / ...topset[1:1] / 1x1 @8.5+ (Top), 2x2 @7.5 (Backoff)

## Day 4


# Week 16
## Day 1
Squat / ...topset[1:1] / 1x1 @9+ (Top), 2x2 @7 (Backoff)
Bench Press / ...topset[1:1] / 1x1 @9+ (Top), 2x2 @7 (Backoff)

## Day 2
Deadlift / ...topset[1:1] / 1x1 @9+ (Top), 2x2 @7 (Backoff)

## Day 3
Bench Press / ...topset[1:1] / 1x1 @9+ (Top), 2x2 @7 (Backoff)

## Day 4


// **Meet week.** Two short sessions early in the week, then rest until the meet.
// * Work up to your planned openers only. No grinders.
# Week 17
## Day 1
// Opener practice. Use competition commands if you have a training partner.
Squat / ...topset[1:1] / 1x1 @7+ (Top), 2x2 @6 (Backoff)
Bench Press / ...topset[1:1] / 1x1 @7+ (Top), 2x2 @6 (Backoff)

## Day 2
// Last session. Light and fast. Deadlift's last heavy single was in week 16.
Bench Press / ...topset[1:1] / 1x1 @6.5+ (Top), 2x2 @6 (Backoff)
pause: Squat / 2x2 @6 / 180s
```
