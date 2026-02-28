-- Profiles/MD11.lua — TFDi MD-11 (MSFS) / Rotate MD-11 (X-Plane)
-- Reads custom L-Vars and writes to Universal ACARS Offset Block

local OFF_FUEL    = 0x66C0
local OFF_ZFW     = 0x66C4
local OFF_PAYLOAD = 0x66C8
local OFF_PBRAKE  = 0x66D0

while true do
    local fuel = 0
    local zfw  = 0

    -- Try TFDi MD-11 L-Vars first (MSFS)
    if ipc.readLvar("TFDI_MD11_FUEL_TOTAL") ~= nil then
        fuel = ipc.readLvar("TFDI_MD11_FUEL_TOTAL")
    end
    if ipc.readLvar("TFDI_MD11_ZFW") ~= nil then
        zfw = ipc.readLvar("TFDI_MD11_ZFW")
    end

    -- Fallback to standard offsets if L-Vars return 0
    if fuel == 0 or fuel == nil then
        fuel = ipc.readFLT(0x0B74) or 0
    end
    if zfw == 0 or zfw == nil then
        zfw = ipc.readFLT(0x3BEC) or 0
    end

    local p_brake = ipc.readUW(0x0BC8)

    -- Write to Universal ACARS Block
    ipc.writeFLT(OFF_FUEL, fuel)
    ipc.writeFLT(OFF_ZFW, zfw)
    ipc.writeUW(OFF_PBRAKE, p_brake)

    ipc.sleep(1000)
end
