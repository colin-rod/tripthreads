/**
 * Password Strength Indicator
 *
 * Visual indicator showing password strength based on:
 * - Length (min 8 characters)
 * - Contains letters
 * - Contains numbers
 * - Contains special characters
 */

'use client'

import * as React from 'react'
import zxcvbn from 'zxcvbn'

interface PasswordStrengthIndicatorProps {
  password: string
  className?: string
}

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'

export function PasswordStrengthIndicator({
  password,
  className = '',
}: PasswordStrengthIndicatorProps) {
  const [strength, setStrength] = React.useState<{
    score: number
    level: StrengthLevel
    feedback: string
  }>({
    score: 0,
    level: 'weak',
    feedback: '',
  })

  React.useEffect(() => {
    if (!password) {
      setStrength({
        score: 0,
        level: 'weak',
        feedback: '',
      })
      return
    }

    // Use zxcvbn for strength calculation
    const result = zxcvbn(password)

    // Map zxcvbn score (0-4) to our strength levels
    const levelMap: Record<number, StrengthLevel> = {
      0: 'weak',
      1: 'weak',
      2: 'fair',
      3: 'good',
      4: 'strong',
    }

    // Check for special characters to boost to "very-strong"
    // eslint-disable-next-line no-useless-escape
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    const finalLevel =
      result.score === 4 && hasSpecialChar && password.length >= 12
        ? 'very-strong'
        : levelMap[result.score]

    setStrength({
      score: result.score,
      level: finalLevel,
      feedback: result.feedback.suggestions[0] || '',
    })
  }, [password])

  if (!password) {
    return null
  }

  // Color and label mapping
  const strengthConfig: Record<
    StrengthLevel,
    { color: string; bgColor: string; label: string; bars: number }
  > = {
    weak: {
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      label: 'Weak',
      bars: 1,
    },
    fair: {
      color: 'text-orange-600',
      bgColor: 'bg-orange-500',
      label: 'Fair',
      bars: 2,
    },
    good: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500',
      label: 'Good',
      bars: 3,
    },
    strong: {
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      label: 'Strong',
      bars: 4,
    },
    'very-strong': {
      color: 'text-green-700',
      bgColor: 'bg-green-600',
      label: 'Very Strong',
      bars: 5,
    },
  }

  const config = strengthConfig[strength.level]

  return (
    <div className={className}>
      {/* Strength bars */}
      <div className="flex gap-1 mb-2">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full transition-colors ${
              index < config.bars ? config.bgColor : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Label and feedback */}
      <div className="flex items-center justify-between text-sm">
        <span className={`font-medium ${config.color}`}>{config.label}</span>
        {strength.feedback && (
          <span className="text-gray-600 dark:text-gray-400 text-xs">{strength.feedback}</span>
        )}
      </div>
    </div>
  )
}
