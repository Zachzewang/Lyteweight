---
id: stronglifts-5x5
name: "StrongLifts 5x5"
author: Mehdi Hadim
url: "https://stronglifts.com/stronglifts-5x5/workout-program/"
shortDescription: "Two alternating full-body barbell workouts, 3 days per week, adding weight every session"
isMultiweek: true
tags: []
frequency: 3
age: "less_than_3_months"
duration: "45-60"
goal: "strength"
---

A beginner barbell program built on five lifts. You alternate two short workouts three times a week and add weight to every lift each time you complete all your reps.

<!-- more -->

## Origin & Philosophy

StrongLifts 5x5 was created by **Mehdi Hadim** and is published free at [stronglifts.com](https://stronglifts.com/stronglifts-5x5/workout-program/). It descends from Bill Starr's 5x5 and Reg Park's 5x5 routines. The idea is to start light, practise the same few compound lifts often, and add a small amount of weight every session for as long as you can.

## Who It's For

- **Experience**: Complete beginners, or lifters returning after a long break
- **Goal**: Get stronger on the squat, bench press, overhead press, row and deadlift
- **Equipment**: Barbell, plates, a squat rack and a bench
- **Time commitment**: 3 sessions per week, about 45-60 minutes each

## Pros & Cons

**Pros**

- Only three exercises per session, so it is easy to learn and quick to run
- [{Squat}] every session gives you a lot of practice on the most technical lift
- Clear rules: complete all sets and add weight, miss reps and repeat the weight

**Cons**

- No direct arm, core or upper-back accessory work
- 5x5 squats three times a week get hard once the weights are heavy
- Only one set of [{Deadlift}] per week on the alternating schedule

## Program Structure

- **Split**: Full body, A/B alternating
- **Frequency**: 3 non-consecutive days per week, for example Monday, Wednesday, Friday
- **Rotation**: Week 1 = A/B/A, Week 2 = B/A/B, then repeat

## Set & Rep Scheme

Every lift uses **5 sets of 5 reps** at the same weight, except [{Deadlift}], which uses **1 set of 5 reps**. Rest 3 minutes between sets, and up to 5 minutes when the weights get heavy.

## Progressive Overload

- Add **5lb (2.5kg)** to [{Squat}], [{Bench Press}], [{Overhead Press}] and [{Bent Over Row}] every session you complete all 5x5.
- Add **10lb (5kg)** to [{Deadlift}] every session you complete 1x5.
- If you miss reps, keep the same weight next session.
- If you fail the same weight three sessions in a row, reduce that lift by 10% and build back up.

## Starting Weights

Start with the empty bar (45lb / 20kg) on squat, bench and overhead press, and 95lb / 40kg on deadlift and row. The light start lets you learn the movements while the weight climbs quickly.

```liftoscript
# Week 1
## Workout A
Squat / 5x5 / 45lb / 180s / progress: lp(5lb, 1, 0, 10%, 3, 0)
Bench Press / 5x5 / 45lb / 180s / progress: lp(5lb, 1, 0, 10%, 3, 0)
Bent Over Row / 5x5 / 95lb / 180s / progress: lp(5lb, 1, 0, 10%, 3, 0)

## Workout B
Squat / 5x5 / 45lb / 180s
Overhead Press / 5x5 / 45lb / 180s / progress: lp(5lb, 1, 0, 10%, 3, 0)
Deadlift / 1x5 / 95lb / 180s / progress: lp(10lb, 1, 0, 10%, 3, 0)
```
