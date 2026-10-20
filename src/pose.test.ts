import assert from 'node:assert/strict'
import test from 'node:test'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { advanceRepPhase, analyzePushUpPose, classifyRepPhase, jointAngle } from './pose.ts'

function landmarks(): NormalizedLandmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }))
}

test('joint angle is normalized to an internal angle between 0 and 180 degrees', () => {
  const straight = jointAngle(
    { x: 0.5, y: 0.3, z: 0, visibility: 1 },
    { x: 0.5, y: 0.5, z: 0, visibility: 1 },
    { x: 0.5, y: 0.7, z: 0, visibility: 1 },
  )
  const bent = jointAngle(
    { x: 0.5, y: 0.3, z: 0, visibility: 1 },
    { x: 0.5, y: 0.5, z: 0, visibility: 1 },
    { x: 0.7, y: 0.5, z: 0, visibility: 1 },
  )
  assert.equal(straight, 180)
  assert.equal(bent, 90)
})

test('squat counts only the bent phase then returns to standing', () => {
  const standing = landmarks()
  standing[23] = { x: 0.3, y: 0.3, z: 0, visibility: 1 }
  standing[25] = { x: 0.3, y: 0.5, z: 0, visibility: 1 }
  standing[27] = { x: 0.3, y: 0.7, z: 0, visibility: 1 }
  standing[24] = { x: 0.7, y: 0.3, z: 0, visibility: 1 }
  standing[26] = { x: 0.7, y: 0.5, z: 0, visibility: 1 }
  standing[28] = { x: 0.7, y: 0.7, z: 0, visibility: 1 }
  assert.equal(classifyRepPhase('squat', standing), 'ready')

  const lowered = [...standing]
  lowered[27] = { x: 0.5, y: 0.5, z: 0, visibility: 1 }
  lowered[28] = { x: 0.9, y: 0.5, z: 0, visibility: 1 }
  assert.equal(classifyRepPhase('squat', lowered), 'active')
})

function setSideViewPushUp(
  pose: NormalizedLandmark[],
  elbow: NormalizedLandmark,
  wrist: NormalizedLandmark,
): void {
  pose[11] = { x: 0.3, y: 0.5, z: 0, visibility: 1 }
  pose[13] = elbow
  pose[15] = wrist
  pose[23] = { x: 0.6, y: 0.5, z: 0, visibility: 1 }
  pose[27] = { x: 0.9, y: 0.5, z: 0, visibility: 1 }
  pose[12] = { x: 0.3, y: 0.5, z: 0, visibility: 0.1 }
  pose[14] = { x: 0.3, y: 0.5, z: 0, visibility: 0.1 }
  pose[16] = { x: 0.3, y: 0.5, z: 0, visibility: 0.1 }
  pose[24] = { x: 0.3, y: 0.5, z: 0, visibility: 0.1 }
  pose[28] = { x: 0.3, y: 0.5, z: 0, visibility: 0.1 }
}

test('push-up requires a valid plank and counts only a full down-up rep', () => {
  const pose = landmarks()
  setSideViewPushUp(
    pose,
    { x: 0.5, y: 0.5, z: 0, visibility: 1 },
    { x: 0.5, y: 0.6, z: 0, visibility: 1 },
  )
  assert.equal(classifyRepPhase('push-up', pose), 'active')

  pose[15] = { x: 0.6, y: 0.5, z: 0, visibility: 1 }
  assert.equal(classifyRepPhase('push-up', pose), 'ready')

  pose[15] = { x: 0.55, y: 0.55, z: 0, visibility: 1 }
  assert.equal(classifyRepPhase('push-up', pose), null)

  pose[15] = { x: 0.5, y: 0.6, z: 0, visibility: 1 }
  pose[27] = { x: 0.6, y: 0.7, z: 0, visibility: 1 }
  assert.equal(classifyRepPhase('push-up', pose), null)
  assert.equal(analyzePushUpPose(pose).reason, 'poor-plank')
})

test('push-up detects a single visible side profile at low visibility', () => {
  const pose = landmarks()
  setSideViewPushUp(
    pose,
    { x: 0.5, y: 0.5, z: 0, visibility: 0.3 },
    { x: 0.5, y: 0.6, z: 0, visibility: 0.3 },
  )
  pose[11]!.visibility = 0.3
  pose[23]!.visibility = 0.3
  pose[27]!.visibility = 0.3
  assert.equal(classifyRepPhase('push-up', pose), 'active')

  pose[15]!.visibility = 0.1
  assert.equal(analyzePushUpPose(pose).reason, 'missing-points')
})

test('rep state machine requires a ready start and a complete down-up cycle', () => {
  let state = advanceRepPhase(null, 'active')
  assert.deepEqual(state, { phase: null, counted: false })

  state = advanceRepPhase(state.phase, 'ready')
  assert.deepEqual(state, { phase: 'ready', counted: false })

  state = advanceRepPhase(state.phase, 'active')
  assert.deepEqual(state, { phase: 'active', counted: false })

  state = advanceRepPhase(state.phase, 'ready')
  assert.deepEqual(state, { phase: 'ready', counted: true })
})

test('jumping jack requires both arms and feet to reach the matching positions', () => {
  const pose = landmarks()
  pose[11] = { x: 0.4, y: 0.4, z: 0, visibility: 1 }
  pose[12] = { x: 0.6, y: 0.4, z: 0, visibility: 1 }
  pose[15] = { x: 0.3, y: 0.1, z: 0, visibility: 1 }
  pose[16] = { x: 0.7, y: 0.1, z: 0, visibility: 1 }
  pose[23] = { x: 0.45, y: 0.6, z: 0, visibility: 1 }
  pose[24] = { x: 0.55, y: 0.6, z: 0, visibility: 1 }
  pose[27] = { x: 0.2, y: 0.9, z: 0, visibility: 1 }
  pose[28] = { x: 0.8, y: 0.9, z: 0, visibility: 1 }
  assert.equal(classifyRepPhase('jumping-jack', pose), 'active')
  pose[15] = { x: 0.3, y: 0.7, z: 0, visibility: 1 }
  pose[16] = { x: 0.7, y: 0.7, z: 0, visibility: 1 }
  pose[27] = { x: 0.46, y: 0.9, z: 0, visibility: 1 }
  pose[28] = { x: 0.54, y: 0.9, z: 0, visibility: 1 }
  assert.equal(classifyRepPhase('jumping-jack', pose), 'ready')
})
