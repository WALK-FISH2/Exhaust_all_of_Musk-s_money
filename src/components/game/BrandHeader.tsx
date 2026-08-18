import { Button, Text, View } from '@tarojs/components'

import { M2_COPY } from '../../i18n/m2'

interface BrandHeaderProps {
  readonly onRestart: () => void
}

export function BrandHeader({ onRestart }: BrandHeaderProps): JSX.Element {
  return (
    <View className='brand-header'>
      <View className='brand-header__main'>
        <Text className='brand-header__eyebrow'>{M2_COPY.eyebrow}</Text>
        <Text className='brand-header__title'>{M2_COPY.title}</Text>
        <Text className='brand-header__subtitle'>{M2_COPY.subtitle}</Text>
      </View>
      <View className='brand-header__actions'>
        <View className='mode-pill'>{M2_COPY.freeMode}</View>
        <Button className='mode-button mode-button--disabled' disabled>
          {M2_COPY.challengeSoon}
        </Button>
        <Button id='restart-game' className='restart-button' onClick={onRestart}>
          {M2_COPY.restart}
        </Button>
      </View>
      <Text className='brand-header__disclaimer'>{M2_COPY.disclaimer}</Text>
    </View>
  )
}
