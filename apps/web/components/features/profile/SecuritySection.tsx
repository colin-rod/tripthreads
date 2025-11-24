/**
 * Security Section
 *
 * Handles account security settings:
 * - Password change (with current password verification)
 * - Delete account (placeholder for future implementation)
 */

'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator'
import { changePassword } from '@/app/actions/profile'
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from '@tripthreads/core/validation/profile'

interface SecuritySectionProps {
  onUpdate?: () => void
}

export function SecuritySection({ onUpdate }: SecuritySectionProps) {
  const { toast } = useToast()
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)
  const [newPasswordValue, setNewPasswordValue] = React.useState('')

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const handlePasswordChange = async (data: ChangePasswordInput) => {
    try {
      setIsChangingPassword(true)
      await changePassword(data.currentPassword, data.newPassword)
      toast({
        title: 'Password changed',
        description: 'Your password has been updated successfully.',
      })
      form.reset()
      setNewPasswordValue('')
      onUpdate?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to change password',
        variant: 'destructive',
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Password change section */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-1">Change Password</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Update your password to keep your account secure
          </p>
        </div>

        <form onSubmit={form.handleSubmit(handlePasswordChange)} className="space-y-4">
          {/* Current password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              {...form.register('currentPassword')}
              disabled={isChangingPassword}
            />
            {form.formState.errors.currentPassword && (
              <p className="text-sm text-red-600">
                {form.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          {/* New password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              {...form.register('newPassword', {
                onChange: e => setNewPasswordValue(e.target.value),
              })}
              disabled={isChangingPassword}
            />
            {form.formState.errors.newPassword && (
              <p className="text-sm text-red-600">{form.formState.errors.newPassword.message}</p>
            )}
            {newPasswordValue && (
              <PasswordStrengthIndicator password={newPasswordValue} className="mt-2" />
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...form.register('confirmPassword')}
              disabled={isChangingPassword}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-red-600">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isChangingPassword}>
            <Lock className="h-4 w-4 mr-2" />
            {isChangingPassword ? 'Changing Password...' : 'Change Password'}
          </Button>
        </form>
      </div>

      {/* Delete account section (placeholder) */}
      <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-800">
        <div>
          <h4 className="text-sm font-medium mb-1 text-red-600">Delete Account</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Permanently delete your account and all associated data
          </p>
        </div>

        <Button
          variant="destructive"
          disabled
          className="opacity-50 cursor-not-allowed"
          title="Account deletion coming soon"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Account (Coming Soon)
        </Button>
      </div>
    </div>
  )
}
