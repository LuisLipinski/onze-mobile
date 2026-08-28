import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Button, Input, Text, TextArea, XStack, YStack } from 'tamagui';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { createGroup, Group, uploadGroupPhoto } from '../src/lib/api';
import { getAccessToken } from '../src/lib/auth-storage';

export default function CreateGroupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
    });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0]);
      setError(null);
    }
  }

  async function submit() {
    if (loading) return;
    if (!name.trim()) {
      setError('Digite o nome do grupo/time.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const group = createdGroup ?? (await createGroup(token, name, description.trim() || undefined));
      if (!createdGroup) setCreatedGroup(group);

      if (photo) {
        try {
          const uploadedGroup = await uploadGroupPhoto(token, group.id, {
            uri: photo.uri,
            fileName: photo.fileName,
            mimeType: photo.mimeType,
          });

          if (!uploadedGroup.photoUrl) {
            throw new Error('A API não confirmou a foto do grupo.');
          }
        } catch (exception) {
          const reason =
            exception instanceof Error && exception.message.trim()
              ? ` Motivo informado: ${exception.message}`
              : '';
          setError(
            `O grupo já foi criado, mas a foto ainda não foi enviada. Toque em Continuar novamente para tentar somente o envio da foto.${reason}`,
          );
          setLoading(false);
          return;
        }
      }

      router.replace({
        pathname: '/create-group-details',
        params: {
          groupId: group.id,
          groupName: group.name,
        },
      });
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível criar o grupo.');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ServerLoadingScreen
        title="Criando seu grupo..."
        message={createdGroup && photo ? 'Enviando a foto escolhida...' : 'Estamos preparando a pelada e seu acesso de administrador.'}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 20 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <YStack gap="$5" paddingVertical="$4">
            <YStack gap="$1">
              <Text color="$onzeGreen" fontSize={14} fontWeight="800">ETAPA 1 DE 3</Text>
              <Text color="$onzeInk" fontSize={30} fontWeight="800">Crie seu grupo</Text>
              <Text color="$onzeMuted" fontSize={15} lineHeight={22}>
                Comece pelo essencial. Você será o administrador principal automaticamente.
              </Text>
            </YStack>

            <YStack
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$6"
              borderWidth={1}
              gap="$4"
              padding="$5"
            >
              <YStack alignItems="center" gap="$3">
                <Image
                  source={photo ? { uri: photo.uri } : require('../assets/icon.png')}
                  style={{ width: 108, height: 108, borderRadius: 24 }}
                />
                <Button
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeGreen"
                  borderWidth={1}
                  onPress={() => void choosePhoto()}
                  pressStyle={{ backgroundColor: '$onzeCanvas' }}
                >
                  <Text color="$onzeGreen" fontWeight="700">
                    {photo ? 'Trocar foto' : 'Escolher foto (opcional)'}
                  </Text>
                </Button>
                <Text color="$onzeMuted" fontSize={12} textAlign="center">
                  Se você escolher uma foto, vamos confirmar o envio antes de avançar.
                </Text>
              </YStack>

              <YStack gap="$2">
                <Text color="$onzeInk" fontSize={14} fontWeight="700">Nome do grupo/time *</Text>
                <Input
                  autoCapitalize="words"
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeBorder"
                  color="$onzeInk"
                  disabled={Boolean(createdGroup)}
                  focusStyle={{ borderColor: '$onzeGreen' }}
                  height={52}
                  maxLength={120}
                  onChangeText={setName}
                  placeholder="Ex.: Pelada de Quinta"
                  placeholderTextColor="$onzeMuted"
                  returnKeyType="next"
                  value={name}
                />
              </YStack>

              <YStack gap="$2">
                <XStack alignItems="center" justifyContent="space-between">
                  <Text color="$onzeInk" fontSize={14} fontWeight="700">Descrição</Text>
                  <Text color="$onzeMuted" fontSize={12}>Opcional</Text>
                </XStack>
                <TextArea
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeBorder"
                  color="$onzeInk"
                  disabled={Boolean(createdGroup)}
                  focusStyle={{ borderColor: '$onzeGreen' }}
                  maxLength={500}
                  minHeight={110}
                  onChangeText={setDescription}
                  placeholder="Conte um pouco sobre o grupo..."
                  placeholderTextColor="$onzeMuted"
                  value={description}
                />
              </YStack>

              {error ? <Text color="$onzeDanger" fontSize={14} lineHeight={20}>{error}</Text> : null}

              <Button
                backgroundColor="$onzeGreen"
                height={52}
                onPress={() => void submit()}
                pressStyle={{ backgroundColor: '$onzeGreenPress' }}
              >
                <Text color="$onzeSurface" fontSize={16} fontWeight="800">
                  {createdGroup && photo ? 'Tentar enviar foto novamente' : 'Continuar'}
                </Text>
              </Button>
            </YStack>

            <Button backgroundColor="transparent" borderWidth={0} onPress={() => router.back()}>
              <Text color="$onzeMuted" fontWeight="700">Voltar</Text>
            </Button>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
