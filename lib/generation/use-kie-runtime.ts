'use client'

import { useSyncExternalStore } from 'react'

import { KIE_PRICING_TTL_MS } from '@/lib/generation/pricing'
import type {
  KiePricingResponse,
  KieStatusResponse,
} from '@/lib/generation/types'

const KIE_STATUS_REFRESH_INTERVAL_MS = 60_000

const emptyKieStatus: KieStatusResponse = {
  connected: false,
  credits: null,
  error: null,
  fetchedAt: null,
  source: null,
}

export type KieRuntimeState<TData> = {
  data: TData
  error: string | null
  isLoading: boolean
}

export type KieRuntimeResult<TData> = {
  data: TData
  error: string | null
}

export type KieRuntimeSnapshot = {
  pricing: KieRuntimeState<KiePricingResponse | null>
  status: KieRuntimeState<KieStatusResponse>
}

type CreateKieRuntimeOptions = {
  fetchPricing: () => Promise<KieRuntimeResult<KiePricingResponse | null>>
  fetchStatus: () => Promise<KieRuntimeResult<KieStatusResponse>>
  initialPricing: KiePricingResponse | null
  initialStatus: KieStatusResponse
  pricingOnErrorData: (error: Error) => KiePricingResponse | null
  pricingRefreshIntervalMs: number
  statusOnErrorData: (error: Error) => KieStatusResponse
  statusRefreshIntervalMs: number
}

type KieRuntimeBranchName = keyof KieRuntimeSnapshot

type KieRuntimeBranchConfig<TData> = {
  fetcher: () => Promise<KieRuntimeResult<TData>>
  onErrorData: (error: Error) => TData
  refreshIntervalMs: number
}

type KieRuntimeBranchController<TData> = {
  config: KieRuntimeBranchConfig<TData>
  inflightRefresh: Promise<KieRuntimeState<TData>> | null
  intervalId: ReturnType<typeof globalThis.setInterval> | null
  listeners: Set<() => void>
}

export type KieRuntime = {
  getPricingSnapshot: () => KieRuntimeState<KiePricingResponse | null>
  getSnapshot: () => KieRuntimeSnapshot
  getStatusSnapshot: () => KieRuntimeState<KieStatusResponse>
  refreshPricing: () => Promise<KieRuntimeState<KiePricingResponse | null>>
  refreshStatus: () => Promise<KieRuntimeState<KieStatusResponse>>
  subscribePricing: (listener: () => void) => () => void
  subscribeStatus: (listener: () => void) => () => void
}

function createKieRuntimeBranchController<TData>(
  config: KieRuntimeBranchConfig<TData>,
): KieRuntimeBranchController<TData> {
  return {
    config,
    inflightRefresh: null,
    intervalId: null,
    listeners: new Set<() => void>(),
  }
}

function buildStatusFallback(error: string): KieStatusResponse {
  return {
    connected: false,
    credits: null,
    error,
    fetchedAt: new Date().toISOString(),
    source: null,
  }
}

async function fetchKiePricing() {
  const response = await fetch('/api/kie/pricing', {
    cache: 'no-store',
  })
  const payload = (await response.json()) as KiePricingResponse

  if (!response.ok || !payload.matrix) {
    return {
      data: null,
      error: payload.error ?? 'Unable to read KIE pricing.',
    }
  }

  return {
    data: payload,
    error: null,
  }
}

async function fetchKieStatus() {
  const response = await fetch('/api/kie/status', {
    cache: 'no-store',
  })
  const payload = (await response.json()) as KieStatusResponse
  const error = response.ok
    ? payload.error ?? null
    : payload.error ?? 'Unable to read KIE status.'

  return {
    data: response.ok ? payload : buildStatusFallback(error),
    error,
  }
}

export function createKieRuntime(options: CreateKieRuntimeOptions): KieRuntime {
  let snapshot: KieRuntimeSnapshot = {
    pricing: {
      data: options.initialPricing,
      error: null,
      isLoading: true,
    },
    status: {
      data: options.initialStatus,
      error: null,
      isLoading: true,
    },
  }
  const pricingController = createKieRuntimeBranchController({
    fetcher: options.fetchPricing,
    onErrorData: options.pricingOnErrorData,
    refreshIntervalMs: options.pricingRefreshIntervalMs,
  })
  const statusController = createKieRuntimeBranchController({
    fetcher: options.fetchStatus,
    onErrorData: options.statusOnErrorData,
    refreshIntervalMs: options.statusRefreshIntervalMs,
  })

  const emitBranchChange = <TData>(
    controller: KieRuntimeBranchController<TData>,
  ) => {
    controller.listeners.forEach((listener) => {
      listener()
    })
  }

  const updateBranchSnapshot = <TBranch extends KieRuntimeBranchName>(
    branch: TBranch,
    controller: KieRuntimeBranchController<KieRuntimeSnapshot[TBranch]['data']>,
    nextState: KieRuntimeSnapshot[TBranch],
  ) => {
    snapshot = {
      ...snapshot,
      [branch]: nextState,
    }
    emitBranchChange(controller)
    return nextState
  }

  const refreshBranch = <TBranch extends KieRuntimeBranchName>(
    branch: TBranch,
    controller: KieRuntimeBranchController<KieRuntimeSnapshot[TBranch]['data']>,
  ) => {
    if (controller.inflightRefresh) {
      return controller.inflightRefresh
    }

    controller.inflightRefresh = controller.config.fetcher()
      .then((result) =>
        updateBranchSnapshot(branch, controller, {
          data: result.data,
          error: result.error,
          isLoading: false,
        }),
      )
      .catch((error) => {
        const resolvedError =
          error instanceof Error
            ? error
            : new Error('Unable to refresh KIE data.')

        return updateBranchSnapshot(branch, controller, {
          data: controller.config.onErrorData(resolvedError),
          error: resolvedError.message,
          isLoading: false,
        })
      })
      .finally(() => {
        controller.inflightRefresh = null
      }) as Promise<KieRuntimeSnapshot[TBranch]>

    return controller.inflightRefresh
  }

  const startBranchPolling = <TBranch extends KieRuntimeBranchName>(
    branch: TBranch,
    controller: KieRuntimeBranchController<KieRuntimeSnapshot[TBranch]['data']>,
  ) => {
    if (controller.intervalId !== null) {
      return
    }

    void refreshBranch(branch, controller)
    controller.intervalId = globalThis.setInterval(() => {
      void refreshBranch(branch, controller)
    }, controller.config.refreshIntervalMs)
  }

  const stopBranchPolling = <TData>(
    controller: KieRuntimeBranchController<TData>,
  ) => {
    if (controller.intervalId === null) {
      return
    }

    globalThis.clearInterval(controller.intervalId)
    controller.intervalId = null
  }

  const subscribeBranch = <TBranch extends KieRuntimeBranchName>(
    branch: TBranch,
    controller: KieRuntimeBranchController<KieRuntimeSnapshot[TBranch]['data']>,
    listener: () => void,
  ) => {
    controller.listeners.add(listener)

    if (controller.listeners.size === 1) {
      startBranchPolling(branch, controller)
    }

    return () => {
      controller.listeners.delete(listener)

      if (controller.listeners.size === 0) {
        stopBranchPolling(controller)
      }
    }
  }

  return {
    getPricingSnapshot: () => snapshot.pricing,
    getSnapshot: () => snapshot,
    getStatusSnapshot: () => snapshot.status,
    refreshPricing: () => refreshBranch('pricing', pricingController),
    refreshStatus: () => refreshBranch('status', statusController),
    subscribePricing: (listener) =>
      subscribeBranch('pricing', pricingController, listener),
    subscribeStatus: (listener) =>
      subscribeBranch('status', statusController, listener),
  }
}

const sharedKieRuntime = createKieRuntime({
  fetchPricing: fetchKiePricing,
  fetchStatus: fetchKieStatus,
  initialPricing: null,
  initialStatus: emptyKieStatus,
  pricingOnErrorData: () => null,
  pricingRefreshIntervalMs: KIE_PRICING_TTL_MS,
  statusOnErrorData: (error) => buildStatusFallback(error.message),
  statusRefreshIntervalMs: KIE_STATUS_REFRESH_INTERVAL_MS,
})

export function useKiePricingRuntime() {
  const snapshot = useSyncExternalStore(
    sharedKieRuntime.subscribePricing,
    sharedKieRuntime.getPricingSnapshot,
    sharedKieRuntime.getPricingSnapshot,
  )

  return {
    ...snapshot,
    refreshPricing: sharedKieRuntime.refreshPricing,
  }
}

export function useKieStatusRuntime() {
  const snapshot = useSyncExternalStore(
    sharedKieRuntime.subscribeStatus,
    sharedKieRuntime.getStatusSnapshot,
    sharedKieRuntime.getStatusSnapshot,
  )

  return {
    ...snapshot,
    refreshStatus: sharedKieRuntime.refreshStatus,
  }
}
