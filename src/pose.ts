import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export type RepExercise = 'squat' | 'push-up' | 'jumping-jack'
export type RepPhase = 'ready' | 'active'
export type PushUpPose = {
  phase: RepPhase | null
  reason: 'missing-points' | 'poor-plank' | null
}
export type RepTransition = {
  phase: RepPhase | null
  counted: boolean
}

export function jointAngle(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  c: NormalizedLandmark,
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  const degrees = Math.abs((radians * 180) / Math.PI) % 360
  return degrees > 180 ? 360 - degrees : degrees
}

function visible(point: NormalizedLandmark | undefined, threshold = 0.5): point is NormalizedLandmark {
  return Boolean(point && (point.visibility ?? 0) >= threshold)
}

function limbAngle(
  landmarks: NormalizedLandmark[],
  a: number,
  b: number,
  c: number,
  visibilityThreshold = 0.5,
): number | null {
  if (
    !visible(landmarks[a], visibilityThreshold) ||
    !visible(landmarks[b], visibilityThreshold) ||
    !visible(landmarks[c], visibilityThreshold)
  ) return null
  return jointAngle(landmarks[a]!, landmarks[b]!, landmarks[c]!)
}

function meanVisible(left: number | null, right: number | null): number | null {
  if (left !== null && right !== null) return (left + right) / 2
  return left ?? right
}

export function analyzePushUpPose(landmarks: NormalizedLandmark[]): PushUpPose {
  const sides = [
    { shoulder: 11, elbow: 13, wrist: 15, hip: 23, ankle: 27 },
    { shoulder: 12, elbow: 14, wrist: 16, hip: 24, ankle: 28 },
  ] as const
  const visibleSides = sides.filter(({ shoulder, elbow, wrist, hip, ankle }) =>
    [shoulder, elbow, wrist, hip, ankle].every((index) => visible(landmarks[index], 0.25)))
  if (visibleSides.length === 0) return { phase: null, reason: 'missing-points' }

  const validSide = visibleSides.find(({ shoulder, hip, ankle }) => {
    const plankAngle = limbAngle(landmarks, shoulder, hip, ankle, 0.25)
    return plankAngle !== null && plankAngle >= 160
  })
  if (!validSide) return { phase: null, reason: 'poor-plank' }

  const elbowAngle = limbAngle(
    landmarks,
    validSide.shoulder,
    validSide.elbow,
    validSide.wrist,
    0.25,
  )
  if (elbowAngle === null) return { phase: null, reason: 'missing-points' }
  if (elbowAngle <= 90) return { phase: 'active', reason: null }
  if (elbowAngle >= 160) return { phase: 'ready', reason: null }
  return { phase: null, reason: null }
}

export function advanceRepPhase(
  current: RepPhase | null,
  candidate: RepPhase,
): RepTransition {
  if (current === null) {
    return { phase: candidate === 'ready' ? 'ready' : null, counted: false }
  }
  if (candidate === current) return { phase: current, counted: false }
  return {
    phase: candidate,
    counted: current === 'active' && candidate === 'ready',
  }
}

export function classifyRepPhase(
  exercise: RepExercise,
  landmarks: NormalizedLandmark[],
): RepPhase | null {
  if (exercise === 'squat') {
    const kneeAngle = meanVisible(
      limbAngle(landmarks, 23, 25, 27),
      limbAngle(landmarks, 24, 26, 28),
    )
    if (kneeAngle === null) return null
    if (kneeAngle < 105) return 'active'
    if (kneeAngle > 155) return 'ready'
    return null
  }

  if (exercise === 'push-up') {
    return analyzePushUpPose(landmarks).phase
  }

  const leftWrist = landmarks[15]
  const rightWrist = landmarks[16]
  const leftShoulder = landmarks[11]
  const rightShoulder = landmarks[12]
  const leftHip = landmarks[23]
  const rightHip = landmarks[24]
  const leftAnkle = landmarks[27]
  const rightAnkle = landmarks[28]
  if (![leftWrist, rightWrist, leftShoulder, rightShoulder, leftHip, rightHip, leftAnkle, rightAnkle]
    .every((point) => visible(point))) {
    return null
  }
  const hipWidth = Math.max(0.04, Math.abs(leftHip.x - rightHip.x))
  const feetWidth = Math.abs(leftAnkle.x - rightAnkle.x)
  const armsOverhead =
    leftWrist.y < leftShoulder.y - 0.08 && rightWrist.y < rightShoulder.y - 0.08
  const armsDown =
    leftWrist.y > leftShoulder.y + 0.1 && rightWrist.y > rightShoulder.y + 0.1
  if (armsOverhead && feetWidth / hipWidth > 1.45) return 'active'
  if (armsDown && feetWidth / hipWidth < 1.25) return 'ready'
  return null
}
