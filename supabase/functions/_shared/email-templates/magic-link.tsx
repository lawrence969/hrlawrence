/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src="https://pifvubfmuubflsftgtrr.supabase.co/storage/v1/object/public/email-assets/logo-navy.jpg" width="180" alt="HR Lawrence Fine Jewelry" style={logo} />
        </Section>
        <Heading style={h1}>Your Login Link</Heading>
        <Text style={text}>
          Click the button below to sign in to your {siteName} account. This link will expire shortly.
        </Text>
        <Button style={button} href={confirmationUrl}>Sign In</Button>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
        <Text style={divider}>—</Text>
        <Text style={brandFooter}>HR Lawrence Fine Jewelry</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Raleway', 'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '30px' }
const logo = { margin: '0 auto' }
const h1 = { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '24px', fontWeight: '600' as const, color: '#1C2951', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#6D7187', lineHeight: '1.6', margin: '0 0 28px' }
const button = { backgroundColor: '#1C2951', color: '#ffffff', fontSize: '13px', fontWeight: '600' as const, letterSpacing: '1px', textTransform: 'uppercase' as const, borderRadius: '4px', padding: '14px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }
const divider = { fontSize: '12px', color: '#e0e0e0', margin: '20px 0 0', textAlign: 'center' as const }
const brandFooter = { fontSize: '11px', color: '#C49A3C', textAlign: 'center' as const, margin: '8px 0 0', letterSpacing: '1px', textTransform: 'uppercase' as const }
