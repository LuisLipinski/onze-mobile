import { Button, Text, XStack, YStack } from 'tamagui';

import type { PlayerSkill } from '../lib/api';
import {
  halfStarsLabel,
  nextHalfStar,
  PLAYER_SKILL_GROUPS,
} from '../lib/technical-ratings';

type TechnicalRatingEditorProps = {
  ratings: Partial<Record<PlayerSkill, number>>;
  importantSkills?: ReadonlySet<PlayerSkill>;
  disabled?: boolean;
  onChange: (skill: PlayerSkill, rating: number | undefined) => void;
};

export function TechnicalRatingEditor({
  ratings,
  importantSkills = new Set<PlayerSkill>(),
  disabled = false,
  onChange,
}: TechnicalRatingEditorProps) {
  return (
    <YStack gap="$5">
      {PLAYER_SKILL_GROUPS.map((group) => (
        <YStack key={group.label} gap="$3">
          <Text color="$onzeMuted" fontSize={11} fontWeight="900">{group.label}</Text>
          {group.skills.map((skill) => {
            const rating = ratings[skill.value];
            const important = importantSkills.has(skill.value);
            return (
              <YStack
                key={skill.value}
                backgroundColor={important ? '#EAF7EF' : '$onzeCanvas'}
                borderColor={important ? '$onzeGreen' : '$onzeBorder'}
                borderRadius="$5"
                borderWidth={1}
                gap="$3"
                padding="$4"
              >
                <XStack alignItems="flex-start" gap="$2" justifyContent="space-between">
                  <YStack flex={1} gap="$1">
                    <Text color="$onzeInk" fontSize={14} fontWeight="900">{skill.label}</Text>
                    {important ? (
                      <Text color="$onzeGreen" fontSize={11} fontWeight="900">
                        IMPORTANTE PARA ESTA POSIÇÃO
                      </Text>
                    ) : null}
                  </YStack>
                  <Text color={rating == null ? '$onzeMuted' : '$onzeGreen'} fontSize={13} fontWeight="900">
                    {halfStarsLabel(rating)}
                  </Text>
                </XStack>

                <XStack gap="$2">
                  <Button
                    accessibilityLabel={`Diminuir ${skill.label} em meia estrela`}
                    backgroundColor="$onzeSurface"
                    borderColor="$onzeBorder"
                    borderWidth={1}
                    disabled={disabled || rating == null || rating <= 1}
                    flex={1}
                    onPress={() => onChange(skill.value, nextHalfStar(rating, -1))}
                  >
                    <Text color="$onzeInk" fontWeight="900">− 0,5</Text>
                  </Button>
                  <Button
                    accessibilityLabel={`Aumentar ${skill.label} em meia estrela`}
                    backgroundColor="$onzeGreen"
                    disabled={disabled || rating === 10}
                    flex={1}
                    onPress={() => onChange(skill.value, nextHalfStar(rating, 1))}
                  >
                    <Text color="$onzeSurface" fontWeight="900">+ 0,5</Text>
                  </Button>
                </XStack>
                <Button
                  accessibilityLabel={`Marcar ${skill.label} como não avaliado`}
                  backgroundColor="transparent"
                  disabled={disabled || rating == null}
                  onPress={() => onChange(skill.value, undefined)}
                >
                  <Text color="$onzeMuted" fontSize={12} fontWeight="800">Não avaliado</Text>
                </Button>
              </YStack>
            );
          })}
        </YStack>
      ))}
    </YStack>
  );
}
