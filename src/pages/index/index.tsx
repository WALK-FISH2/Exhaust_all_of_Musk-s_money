import { Text, View } from '@tarojs/components'
import { useEffect, useRef } from 'react'

import { M5_WEAPP_BENCHMARK_ENABLED, M5_WEAPP_SMOKE_ENABLED } from '../../benchmark/build-flags'
import { getM5RuntimeConsoleErrors, installM5RuntimeBridge } from '../../benchmark/runtime-bridge'
import { WeappCatalogBenchmark } from '../../benchmark/WeappCatalogBenchmark'
import { BalancePanel } from '../../components/game/BalancePanel'
import { BrandHeader } from '../../components/game/BrandHeader'
import { CatalogToolbar } from '../../components/game/CatalogToolbar'
import { ChallengePicker } from '../../components/game/ChallengePicker'
import { ChallengeStatus } from '../../components/game/ChallengeStatus'
import { AchievementFeedback, FeedbackBanner } from '../../components/game/FeedbackOverlays'
import { FreeModeResult } from '../../components/game/FreeModeResult'
import { ProductCard } from '../../components/game/ProductCard'
import { MotionSettings } from '../../components/game/MotionSettings'
import { PwaStatus } from '../../components/game/PwaStatus'
import { ClearDataDialog, RestoreDialog } from '../../components/game/PersistenceDialogs'
import { ProgressOverview } from '../../components/game/ProgressOverview'
import { ReceiptPanel } from '../../components/game/ReceiptPanel'
import { RestartDialog } from '../../components/game/RestartDialog'
import { ACHIEVEMENT_DEFINITIONS } from '../../data/achievements'
import { isChallengeMode } from '../../domain/game-state'
import { useFreeModeGame } from '../../hooks/use-free-mode-game'
import { DOMAIN_ERROR_COPY, M2_COPY, UI_NOTICE_COPY } from '../../i18n/m2'
import { M3_COPY } from '../../i18n/m3'
import { M4_COPY } from '../../i18n/m4'
import { useChallengeSharing } from '../../platform/weapp/use-challenge-sharing'

import './index.scss'

import { AccessibleButton as Button } from '../../ui/AccessibleButton'

const ACHIEVEMENT_NAMES_BY_ID: Readonly<Record<string, string>> = Object.fromEntries(
  ACHIEVEMENT_DEFINITIONS.map((achievement) => [achievement.id, achievement.nameZh]),
)

export default function IndexPage(): JSX.Element {
  return M5_WEAPP_BENCHMARK_ENABLED ? <WeappCatalogBenchmark /> : <GamePage />
}

function GamePage(): JSX.Element {
  const { state, viewModel, hydrationStatus, persistenceMessage, actions } = useFreeModeGame()
  const sharedChallenge = useChallengeSharing(state.run, state.records)
  const appliedSharedChallenge = useRef<string | null>(null)
  const selectMode = actions.selectMode

  useEffect(() => {
    if (hydrationStatus !== 'ready' || sharedChallenge === null) return
    const shareKey = `${sharedChallenge.mode}:${sharedChallenge.durationSeconds}:${sharedChallenge.recordMs ?? ''}`
    if (appliedSharedChallenge.current === shareKey) return
    appliedSharedChallenge.current = shareKey
    selectMode(sharedChallenge.mode)
  }, [hydrationStatus, selectMode, sharedChallenge])

  useEffect(() => {
    if (!M5_WEAPP_SMOKE_ENABLED) return undefined
    return installM5RuntimeBridge({
      kind: 'formal-smoke',
      snapshot: () => ({
        ready: hydrationStatus !== 'loading',
        hydrationStatus,
        mode: state.run.mode,
        status: state.run.status,
        view: state.view,
        restorePromptOpen: state.restorePromptOpen,
        modePickerOpen: state.modePickerOpen,
        restartConfirmationOpen: state.restartConfirmationOpen,
        luckyStickerQuantity: state.run.quantities['lucky-sticker'] ?? 0,
        totalSpentUsd: viewModel.metrics.totalSpentUsd,
        remainingChallengeMs: viewModel.remainingChallengeMs,
        runtimeConsoleErrors: getM5RuntimeConsoleErrors(),
      }),
      invoke: (action, first) => {
        if (action === 'increment-lucky-sticker') actions.increment('lucky-sticker')
        else if (action === 'continue-restored-run') actions.continueRestoredRun()
        else if (action === 'open-mode-picker') actions.openModePicker()
        else if (action === 'select-mode' && first === 'challenge-30') {
          actions.selectMode('challenge-30')
        } else if (action === 'start-challenge') actions.startChallenge()
        else if (action === 'confirm-restart') actions.confirmRestart()
      },
    })
  }, [actions, hydrationStatus, state, viewModel])

  if (hydrationStatus === 'loading') {
    return (
      <View id='hydration-loading' className='hydration-loading'>
        <Text>{M4_COPY.hydration}</Text>
      </View>
    )
  }

  const feedbackMessage =
    persistenceMessage ??
    (state.errorCode
      ? DOMAIN_ERROR_COPY[state.errorCode]
      : state.noticeCode
        ? UI_NOTICE_COPY[state.noticeCode]
        : null)

  return (
    <View className={`game-page motion-${state.preferences.reducedMotion}`}>
      <View className='game-shell' role='main' ariaLabel={M2_COPY.title}>
        <BrandHeader
          mode={state.run.mode}
          onRestart={actions.requestRestart}
          onOpenChallenges={actions.openModePicker}
          onReturnToFree={() => actions.selectMode('free')}
        />
        <BalancePanel metrics={viewModel.metrics} completed={viewModel.isFrozen} />

        {isChallengeMode(state.run.mode) ? (
          <ChallengeStatus
            mode={state.run.mode}
            status={state.run.status}
            remainingMs={viewModel.remainingChallengeMs ?? 0}
            sharedRecordMs={
              sharedChallenge?.mode === state.run.mode && state.run.status === 'ready'
                ? sharedChallenge.recordMs
                : null
            }
            onStart={actions.startChallenge}
            onChangeChallenge={actions.openModePicker}
          />
        ) : null}

        {state.view === 'result' ? (
          <FreeModeResult
            metrics={viewModel.metrics}
            unlockedAchievementIds={state.run.runUnlockedAchievementIds}
            achievementNamesById={ACHIEVEMENT_NAMES_BY_ID}
            onPlayAgain={actions.playAgain}
            onShowProducts={actions.showProducts}
            challengeResult={viewModel.challengeResult}
            onChangeChallenge={actions.openModePicker}
            lifetimeAchievementCount={viewModel.lifetimeAchievementCount}
            totalAchievementCount={viewModel.totalAchievementCount}
            beatenRecordKinds={state.beatenRecordKinds}
          />
        ) : (
          <>
            {viewModel.isFrozen ? (
              <View className='completed-catalog-banner'>
                <Text className='completed-catalog-banner__label'>
                  {viewModel.challengeResult ? M3_COPY.completedReadOnly : M2_COPY.readOnly}
                </Text>
                <View className='completed-catalog-banner__actions'>
                  <Button
                    id='show-result'
                    className='completed-catalog-button completed-catalog-button--primary'
                    onClick={actions.showResult}
                  >
                    {M2_COPY.viewResult}
                  </Button>
                  <Button
                    id='play-again-from-products'
                    className='completed-catalog-button'
                    onClick={actions.playAgain}
                  >
                    {viewModel.challengeResult ? M3_COPY.retryChallenge : M2_COPY.playAgain}
                  </Button>
                  {viewModel.challengeResult ? (
                    <Button
                      id='change-challenge-from-products'
                      className='completed-catalog-button'
                      onClick={actions.openModePicker}
                    >
                      {M3_COPY.changeChallenge}
                    </Button>
                  ) : null}
                </View>
              </View>
            ) : null}
            <CatalogToolbar
              selectedCategoryId={state.selectedCategoryId}
              searchQuery={state.searchQuery}
              onSelectCategory={actions.selectCategory}
              onSearch={actions.search}
            />
            <View className='catalog-layout'>
              <View className='product-grid'>
                {viewModel.visibleProducts.length === 0 ? (
                  <Text id='empty-search-result' className='empty-search-result'>
                    {M2_COPY.emptySearch}
                  </Text>
                ) : (
                  viewModel.visibleProducts.map((item) => (
                    <ProductCard
                      key={item.product.id}
                      {...item}
                      readOnly={!viewModel.canPurchase}
                      onIncrement={actions.increment}
                      onDecrement={actions.decrement}
                      onMax={actions.max}
                      onSetQuantity={actions.setQuantity}
                    />
                  ))
                )}
              </View>
              <View className='receipt-column'>
                <ReceiptPanel
                  receipt={viewModel.receipt}
                  achievementCount={viewModel.unlockedAchievementCount}
                  totalAchievementCount={viewModel.totalAchievementCount}
                />
              </View>
            </View>
          </>
        )}

        <MotionSettings
          value={state.preferences.reducedMotion}
          onChange={actions.setReducedMotion}
        />

        <ProgressOverview
          lifetimeAchievementIds={state.lifetimeAchievementIds}
          records={state.records}
          currentMode={state.run.mode}
          onRequestClearData={actions.requestClearData}
        />

        <PwaStatus />
        <Text className='game-footer'>{M2_COPY.disclaimer}</Text>
      </View>

      <FeedbackBanner
        message={feedbackMessage}
        onDismiss={persistenceMessage ? actions.dismissPersistenceMessage : actions.dismissFeedback}
      />
      <AchievementFeedback
        achievementIds={state.achievementNotifications}
        namesById={ACHIEVEMENT_NAMES_BY_ID}
        onDismiss={actions.dismissAchievements}
      />
      <RestartDialog
        open={state.restartConfirmationOpen}
        onCancel={actions.cancelRestart}
        onConfirm={actions.confirmRestart}
      />
      <ChallengePicker
        open={state.modePickerOpen}
        currentMode={state.run.mode}
        onClose={actions.closeModePicker}
        onSelectMode={actions.selectMode}
      />
      <RestoreDialog
        open={state.restorePromptOpen}
        onContinue={actions.continueRestoredRun}
        onRestart={actions.restartRestoredRun}
      />
      <ClearDataDialog
        open={state.clearDataConfirmationOpen}
        onCancel={actions.cancelClearData}
        onConfirm={actions.confirmClearData}
      />
    </View>
  )
}
