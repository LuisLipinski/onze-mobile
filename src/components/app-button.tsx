import type { ComponentProps } from 'react';
import { Button } from 'tamagui';

export type AppButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'destructiveOutline'
  | 'warning';

export type AppButtonSize = 'md' | 'sm' | 'icon';

type TamaguiButtonProps = ComponentProps<typeof Button>;

export type AppButtonProps = Omit<TamaguiButtonProps, 'variant'> & {
  variant?: AppButtonVariant;
  buttonSize?: AppButtonSize;
};

const SIZE_HEIGHTS: Record<AppButtonSize, number> = {
  md: 52,
  sm: 42,
  icon: 36,
};

function inferredVariant(
  backgroundColor: TamaguiButtonProps['backgroundColor'],
  borderColor: TamaguiButtonProps['borderColor'],
): AppButtonVariant {
  if (backgroundColor === '$onzeDanger') return 'destructive';
  if (backgroundColor === '$onzeWarning') return 'warning';
  if (backgroundColor === 'transparent') return 'ghost';
  if (borderColor === '$onzeDanger') return 'destructiveOutline';
  if (backgroundColor === '$onzeSurface' || backgroundColor === '$onzeCanvas') {
    return borderColor === '$onzeGreen' ? 'outline' : 'secondary';
  }
  return 'primary';
}

function variantStyle(variant: AppButtonVariant) {
  switch (variant) {
    case 'secondary':
      return {
        backgroundColor: '$onzeSurface' as const,
        borderColor: '$onzeBorder' as const,
        borderWidth: 1,
        pressStyle: { backgroundColor: '$onzeCanvas' as const },
      };
    case 'outline':
      return {
        backgroundColor: '$onzeSurface' as const,
        borderColor: '$onzeGreen' as const,
        borderWidth: 1,
        pressStyle: { backgroundColor: '$onzeSuccessBg' as const },
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent' as const,
        borderColor: 'transparent' as const,
        borderWidth: 0,
        pressStyle: { backgroundColor: '$onzeCanvas' as const },
      };
    case 'destructive':
      return {
        backgroundColor: '$onzeDanger' as const,
        borderColor: '$onzeDanger' as const,
        borderWidth: 1,
        pressStyle: { opacity: 0.84 },
      };
    case 'destructiveOutline':
      return {
        backgroundColor: '$onzeSurface' as const,
        borderColor: '$onzeDanger' as const,
        borderWidth: 1,
        pressStyle: { backgroundColor: '$onzeDangerBg' as const },
      };
    case 'warning':
      return {
        backgroundColor: '$onzeWarning' as const,
        borderColor: '$onzeWarning' as const,
        borderWidth: 1,
        pressStyle: { opacity: 0.84 },
      };
    case 'primary':
    default:
      return {
        backgroundColor: '$onzeGreen' as const,
        borderColor: '$onzeGreen' as const,
        borderWidth: 1,
        pressStyle: { backgroundColor: '$onzeGreenPress' as const },
      };
  }
}

export function AppButton({
  variant,
  buttonSize,
  backgroundColor,
  borderColor,
  borderRadius,
  borderWidth,
  circular,
  height,
  minHeight,
  pressStyle,
  ...props
}: AppButtonProps) {
  const resolvedVariant = variant ?? inferredVariant(backgroundColor, borderColor);
  const defaults = variantStyle(resolvedVariant);
  const resolvedSize = buttonSize
    ?? (circular ? 'icon' : typeof height === 'number' && height <= 46 ? 'sm' : 'md');
  const keepsFlexibleHeight = height === 'auto' || minHeight !== undefined;

  return (
    <Button
      {...props}
      backgroundColor={backgroundColor ?? defaults.backgroundColor}
      borderColor={borderColor ?? defaults.borderColor}
      borderRadius={borderRadius ?? (circular ? 999 : '$4')}
      borderWidth={borderWidth ?? defaults.borderWidth}
      circular={circular}
      height={keepsFlexibleHeight ? height : SIZE_HEIGHTS[resolvedSize]}
      minHeight={minHeight}
      pressStyle={pressStyle ?? defaults.pressStyle}
    />
  );
}
