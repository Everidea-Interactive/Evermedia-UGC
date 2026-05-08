'use client'

import { useSyncExternalStore } from 'react'

import { KIE_PRICING_TTL_MS } from '@/lib/generation/pricing'
import type {
  KiePricingResponse,
  KieStatusResponse,
} from '@/lib/generation/types'

const KIE_STATUS_REFRESH_INTERVAL_MS = 60_000
const KIE_STATUS_CACHE_KEY = 'evermedia:kie-status'

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

type GlobalWithSharedKieRuntime = typeof globalThis & {
  __evermediaSharedKieRuntime?: KieRuntime
}

function readCachedKieStatus(): KieStatusResponse | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.sessionStorage.getItem(KIE_STATUS_CACHE_KEY)

    if (!rawValue) {
      return null
    }

    const parsedValue = JSON.parse(rawValue) as Partial<KieStatusResponse>

    return {
      connected: parsedValue.connected === true,
      credits:
        typeof parsedValue.credits === 'number' ? parsedValue.credits : null,
      error: typeof parsedValue.error === 'string' ? parsedValue.error : null,
      fetchedAt:
        typeof parsedValue.fetchedAt === 'string' ? parsedValue.fetchedAt : null,
      source:
        parsedValue.source === 'chat-credit' || parsedValue.source === 'user-credits'
          ? parsedValue.source
          : null,
    }
  } catch {
    return null
  }
}

function writeCachedKieStatus(status: KieStatusResponse) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.setItem(KIE_STATUS_CACHE_KEY, JSON.stringify(status))
  } catch {
    // Ignore storage failures and fall back to in-memory state only.
  }
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

function createRuntimeState<TData>(
  data: TData,
  error: string | null,
): KieRuntimeState<TData> {
  return {
    data,
    error,
    isLoading: false,
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
  const fallbackError = payload.error ?? 'Unable to read KIE status.'
  const error = response.ok ? payload.error ?? null : fallbackError

  return {
    data: response.ok ? payload : buildStatusFallback(fallbackError),
    error,
  }
}

export function createKieRuntime(options: CreateKieRuntimeOptions): KieRuntime {
  const hasInitialStatusData = options.initialStatus.fetchedAt !== null
  let snapshot: KieRuntimeSnapshot = {
    pricing: {
      data: options.initialPricing,
      error: null,
      isLoading: true,
    },
    status: {
      data: options.initialStatus,
      error: options.initialStatus.error,
      isLoading: !hasInitialStatusData,
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
    nextState: KieRuntimeState<KieRuntimeSnapshot[TBranch]['data']>,
  ) => {
    snapshot = {
      ...snapshot,
      [branch]: nextState,
    } as KieRuntimeSnapshot
    emitBranchChange(controller)
    return nextState as KieRuntimeSnapshot[TBranch]
  }

  const refreshBranch = <TBranch extends KieRuntimeBranchName>(
    branch: TBranch,
    controller: KieRuntimeBranchController<KieRuntimeSnapshot[TBranch]['data']>,
  ) => {
    if (controller.inflightRefresh) {
      return controller.inflightRefresh
    }

    controller.inflightRefresh = controller.config.fetcher()
      .then((result) => {
        if (branch === 'status') {
          writeCachedKieStatus(result.data as KieStatusResponse)
        }

        const nextState = createRuntimeState(result.data, result.error)

        return updateBranchSnapshot(branch, controller, nextState)
      })
      .catch((error) => {
        const resolvedError =
          error instanceof Error
            ? error
            : new Error('Unable to refresh KIE data.')

        const nextState = createRuntimeState(
          controller.config.onErrorData(resolvedError),
          resolvedError.message,
        )

        return updateBranchSnapshot(branch, controller, nextState)
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

function getSharedKieRuntime() {
  const globalScope = globalThis as GlobalWithSharedKieRuntime

  if (!globalScope.__evermediaSharedKieRuntime) {
    const cachedStatus = readCachedKieStatus()

    globalScope.__evermediaSharedKieRuntime = createKieRuntime({
      fetchPricing: fetchKiePricing,
      fetchStatus: fetchKieStatus,
      initialPricing: null,
      initialStatus: cachedStatus ?? emptyKieStatus,
      pricingOnErrorData: () => null,
      pricingRefreshIntervalMs: KIE_PRICING_TTL_MS,
      statusOnErrorData: (error) => buildStatusFallback(error.message),
      statusRefreshIntervalMs: KIE_STATUS_REFRESH_INTERVAL_MS,
    })
  }

  return globalScope.__evermediaSharedKieRuntime
}

const sharedKieRuntime = getSharedKieRuntime()

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
