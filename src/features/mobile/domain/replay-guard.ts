import type { QueuedMutation, SyncConflict } from "@/features/mobile/domain/mobile-sync"

export type ReplayQueueDecision = "ready" | "dependency" | "conflict"

export function replayQueueDecision(
  mutation: QueuedMutation,
  currentMutations: readonly QueuedMutation[],
  conflicts: readonly SyncConflict[],
  operatorId: string,
  scope: string,
): ReplayQueueDecision {
  if (mutation.actor.userId !== operatorId || mutation.scope !== scope) {
    throw new Error("Queued work belongs to another account or environment and remains locked.")
  }
  if (mutation.dependsOn.some((id) => currentMutations.some((entry) => entry.id === id))) return "dependency"
  if (conflicts.some((conflict) => conflict.mutationId === mutation.id)) return "conflict"
  return "ready"
}

export function requireReplaySession(sessionUserId: string | null | undefined, operatorId: string) {
  if (sessionUserId !== operatorId) throw new Error("Sign in again as the original account to sync this work.")
}
