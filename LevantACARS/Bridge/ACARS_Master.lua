-- ============================================================================
-- ACARS_Master.lua — Levant VA ACARS
-- Master Dispatcher: detects which aircraft you are flying and runs the
-- correct Lua profile. All profiles write to the same Universal Offset Block
-- (0x66C0–0x66D4) so the React app always reads the same addresses.
--
-- INSTALLATION:
--   1. Copy this file + the Profiles/ folder into your FSUIPC7 lua folder:
--        C:\Users\<you>\AppData\Roaming\FSUIPC7\
--   2. Open FSUIPC7.ini and add under [Auto]:
--        1=Lua ACARS_Master
--   3. Ensure the FSUIPC7 WASM module is installed in MSFS Community folder
--      (fsuipc-lvar-module) — required for L-Var reading.
--   4. Restart MSFS.
--
-- UNIVERSAL OFFSET MAP (all profiles write here):
--   0x66C0  Float   Total Fuel (KG)
--   0x66C4  Float   Zero Fuel Weight (KG)
--   0x66C8  Float   Payload (KG)
--   0x66CC  Float   Landing Rate (ft/min)
--   0x66D0  UInt16  Parking Brake (0/1)
--   0x66D4  UInt16  Doors (0=closed, 1=open)
-- ============================================================================

local current_script = ""

function switch_profile(new_script)
    if current_script ~= new_script then
        if current_script ~= "" then
            ipc.macro("LuaKill " .. current_script)
            ipc.log("ACARS: Killing old profile: " .. current_script)
        end
        ipc.macro("Lua " .. new_script)
        current_script = new_script
        ipc.log("ACARS: Started new profile: " .. new_script)
    end
end

while true do
    local title = ipc.readSTR(0x3D00, 256):lower()

    if string.find(title, "md[-]?11") then
        switch_profile("Profiles/MD11")
    elseif string.find(title, "a32") or string.find(title, "a319") or string.find(title, "a321") then
        switch_profile("Profiles/Airbus_A32X")
    elseif string.find(title, "737") then
        switch_profile("Profiles/B737")
    elseif string.find(title, "777") or string.find(title, "787") then
        switch_profile("Profiles/Boeing_Longhaul")
    elseif string.find(title, "e170") or string.find(title, "e175") or string.find(title, "e190") or string.find(title, "e195") then
        switch_profile("Profiles/EJets")
    elseif string.find(title, "757") or string.find(title, "767") then
        switch_profile("Profiles/B757_B767")
    else
        switch_profile("Profiles/Default")
    end

    ipc.sleep(5000) -- Check for aircraft changes every 5 seconds
end
