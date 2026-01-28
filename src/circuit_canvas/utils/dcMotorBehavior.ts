export interface DCMotorRuntimeState {
  angularSpeed: number;
  lastUpdateAt?: number;
}

export const DC_MOTOR_RM = 10;
export const DC_MOTOR_KE = 0.02;
export const DC_MOTOR_KT = 0.02;
export const DC_MOTOR_INERTIA = 0.01;
export const DC_MOTOR_DAMPING = 0.001;

export const createInitialMotorRuntime = (): DCMotorRuntimeState => ({
  angularSpeed: 0,
  lastUpdateAt: undefined,
});

export function updateMotorRuntime(params: {
  prev?: DCMotorRuntimeState;
  voltage?: number;
  current?: number;
  dt: number;
  nowMs: number;
}): DCMotorRuntimeState {
  const { prev, dt, nowMs } = params;
  let omega = prev?.angularSpeed ?? 0;
  omega += ((params.current ?? 0) * DC_MOTOR_KT - DC_MOTOR_DAMPING * omega) / DC_MOTOR_INERTIA * dt;
  omega = Math.max(-500, Math.min(500, omega));

  return {
    angularSpeed: omega,
    lastUpdateAt: nowMs,
  };
}

export function motorOmegaToRpm(omega: number): number {
  return (omega * 60) / (2 * Math.PI);
}
