// components/common/PasswordInput.tsx
//
// A TextInput for passwords with a tappable eye icon to reveal/hide what's
// been typed. Used on the login/signup form and the reset-password screen.
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, TextInputProps, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry' | 'style'> {
  /** The caller's usual input style (e.g. styles.input) — marginBottom is
   *  applied to the wrapper instead, so pass it here as normal. */
  style?: StyleProp<TextStyle>;
}

export default function PasswordInput({ style, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={localStyles.wrapper}>
      <TextInput
        {...rest}
        style={[style, localStyles.input] as StyleProp<TextStyle>}
        secureTextEntry={!visible}
      />
      <TouchableOpacity
        style={localStyles.eyeButton}
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name={visible ? 'eye-off' : 'eye'} size={20} color="#B0B0B0" />
      </TouchableOpacity>
    </View>
  );
}

const localStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 15,
  } as ViewStyle,
  input: {
    marginBottom: 0,
    paddingRight: 44,
  },
  eyeButton: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
