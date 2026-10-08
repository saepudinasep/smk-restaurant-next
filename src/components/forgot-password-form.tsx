import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function ForgotPasswordForm({ ...props }: React.ComponentProps<typeof Card>) {
  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Lupa Password</CardTitle>
        <CardDescription>Masukkan Username Anda untuk mereset password</CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='username'>Username</FieldLabel>
              <Input id='username' type='text' placeholder='Masukkan Username' required />
            </Field>
            <Field>
              <FieldLabel htmlFor='newPassword'>New Password</FieldLabel>
              <Input
                id='newPassword'
                type='password'
                placeholder='Masukkan password baru'
                required
              />
              <FieldDescription>
                Password harus terdiri dari minimal 8 karakter, termasuk huruf besar, huruf kecil,
                angka, dan simbol.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor='confirmPassword'>Confirm Password</FieldLabel>
              <Input
                id='confirmPassword'
                type='password'
                placeholder='Konfirmasi password'
                required
              />
              <FieldDescription>silahkan konfirmasi password Anda</FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button type='submit'>Reset Password</Button>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
