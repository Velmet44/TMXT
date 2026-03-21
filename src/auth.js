import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://wirffpepjiuaozoksgfe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcmZmcGVwaml1YW96b2tzZ2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTcyNDIsImV4cCI6MjA4OTY3MzI0Mn0.DNnTscq5fVNkSRmkSYhv6_9Qi8Q9AAKEDWPzUybtA6g'

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })
    return { data, error }
}

export async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    })
    return { data, error }
}

export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
    })
    return { data, error }
}

export async function logout() {
    const { error } = await supabase.auth.signOut()
    return { error }
}

export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
}
