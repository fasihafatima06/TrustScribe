Add-Type -AssemblyName System.Speech

# Sample 1: Telugu-English Rural Payments
$s1 = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s1.Rate = -1
$s1.SetOutputToWaveFile("backend\uploads\sample_rural_payments_telugu_en.wav")
$s1.Speak("Namaskaram andi. How are you using digital payments in your village?")
Start-Sleep -Milliseconds 300
$s1.Speak("Here, network weak undi, so payment process avvaledu.")
Start-Sleep -Milliseconds 300
$s1.Speak("Account lo money was deducted, but shopkeeper ki confirmation message raledu.")
Start-Sleep -Milliseconds 300
$s1.Speak("Did you then call the bank helpline or raise a ticket on the PhonePe app?")
Start-Sleep -Milliseconds 300
$s1.Speak("We checked at the Gram Panchayat Rythu Bharosa center, and received the refund within two days.")
$s1.Dispose()

# Sample 2: Hindi-English Digital Banking
$s2 = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s2.Rate = -1
$s2.SetOutputToWaveFile("backend\uploads\sample_digital_banking_hindi_en.wav")
$s2.Speak("Namaste. Can you share how you use UPI and Google Pay in your daily routine?")
Start-Sleep -Milliseconds 300
$s2.Speak("Ration shop par server down hota hai toh payment atak jati hai.")
Start-Sleep -Milliseconds 300
$s2.Speak("Khate se paanch sau rupaye debit ho gaye, lekin merchant account me reflect nahi hue.")
Start-Sleep -Milliseconds 300
$s2.Speak("Did you visit the bank branch to log a complaint or call customer care?")
Start-Sleep -Milliseconds 300
$s2.Speak("I raised a PhonePe support ticket, and the auto reversal came through in 48 hours.")
$s2.Dispose()

# Sample 3: Tamil-English Healthcare
$s3 = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s3.Rate = -1
$s3.SetOutputToWaveFile("backend\uploads\sample_healthcare_tamil_en.wav")
$s3.Speak("Vanakkam. How has your experience been at the Primary Health Centre?")
Start-Sleep -Milliseconds 300
$s3.Speak("Token queue is very long when we go in the morning at eight.")
Start-Sleep -Milliseconds 300
$s3.Speak("Doctor wrote a prescription, but at the pharmacy they said medicines were out of stock.")
Start-Sleep -Milliseconds 300
$s3.Speak("Did you then have to purchase them out of pocket from a private medical shop?")
Start-Sleep -Milliseconds 300
$s3.Speak("Yes, despite having the Chief Minister Comprehensive Health Insurance card, we incurred medicine expenses.")
$s3.Dispose()

Write-Host "ALL 3 AUDIO SAMPLES GENERATED SUCCESSFULLY"
