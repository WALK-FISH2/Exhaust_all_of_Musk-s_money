import { Button, Text, View } from '@tarojs/components'

import { BalancePanel } from '../../components/game/BalancePanel'
import { BrandHeader } from '../../components/game/BrandHeader'
import { CatalogToolbar } from '../../components/game/CatalogToolbar'
import { ChallengePicker } from '../../components/game/ChallengePicker'
import { ChallengeStatus } from '../../components/game/ChallengeStatus'
import { AchievementFeedback, FeedbackBanner } from '../../components/game/FeedbackOverlays'
import { FreeModeResult } from '../../components/game/FreeModeResult'
import { ProductCard } from '../../components/game/ProductCard'
import { ReceiptPanel } from '../../components/game/ReceiptPanel'
import { RestartDialog } from '../../components/game/RestartDialog'
import { ACHIEVEMENT_DEFINITIONS } from '../../data/achievements'
import { useFreeModeGame } from '../../hooks/use-free-mode-game'
import { isChallengeMode } from '../../domain/game-state'
import { DOMAIN_ERROR_COPY, M2_COPY, UI_NOTICE_COPY } from '../../i18n/m2'
import { M3_COPY } from '../../i18n/m3'

import './index.scss'

const ACHIEVEMENT_NAMES_BY_ID: Readonly<Record<string, string>> = Object.fromEntries(
  ACHIEVEMENT_DEFINITIONS.map((achievement) => [achievement.id, achievement.nameZh]),
)

export default function IndexPage(): JSX.Element {
  const { state, viewModel, actions } = useFreeModeGame()
  const feedbackMessage = state.errorCode
    ? DOMAIN_ERROR_COPY[state.errorCode]
    : state.noticeCode
      ? UI_NOTICE_COPY[state.noticeCode]
      : null

  return (
    <View className='game-page'>
      <View className='game-shell'>
        <BrandHeader
          mode={state.run.mode}
          onRestart={actions.requestRestart}
          onOpenChallenges={actions.openModePicker}
        />
        <BalancePanel metrics={viewModel.metrics} completed={viewModel.isFrozen} />

        {isChallengeMode(state.run.mode) ? (
          <ChallengeStatus
            mode={state.run.mode}
            status={state.run.status}
            remainingMs={viewModel.remainingChallengeMs ?? 0}
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

        <Text className='game-footer'>{M2_COPY.disclaimer}</Text>
      </View>

      <FeedbackBanner message={feedbackMessage} onDismiss={actions.dismissFeedback} />
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
    </View>
  )
}
