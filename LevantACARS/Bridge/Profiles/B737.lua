-- Profiles/B737.lua — PMDG 737 (MSFS)
-- NOTE: PMDG requires "SDK Broadcast" enabled in 737_Options.ini
-- Reads custom L-Vars and writes to Universal ACARS Offset Block

local OFF_FUEL    = 0x66C0
local OFF_ZFW     = 0x66C4
local OFF_PBRAKE  = 0x66D0

while true do
    local fuel = 0
    local zfw  = 0

    -- Try PMDG 737 L-Vars
    if ipc.readLvar("ngx_fuel_total") ~= nil then
        fuel = ipc.readLvar("ngx_fuel_total")
    end
    if ipc.readLvar("ngx_zfw") ~= nil then
        zfw = ipc.readLvar("ngx_zfw")
    end

    -- Fallback to standard offsets
    if fuel == 0 or fuel == nil then
        fuel = ipc.readFLT(0x0B74) or 0
    end
    if zfw == 0 or zfw == nil then
        zfw = ipc.readFLT(0x3BEC) or 0
    end

    local p_brake = ipc.readUW(0x0BC8)

    ipc.writeFLT(OFF_FUEL, fuel)
    ipc.writeFLT(OFF_ZFW, zfw)
    ipc.writeUW(OFF_PBRAKE, p_brake)

    ipc.sleep(1000)
end
