import { AppButton, type AppButtonProps } from './app-button';

type BackButtonProps = Omit<AppButtonProps, 'children' | 'variant'>;

export function BackButton(props: BackButtonProps) {
  return (
    <AppButton alignSelf="flex-start" {...props} variant="secondary">
      Voltar
    </AppButton>
  );
}
