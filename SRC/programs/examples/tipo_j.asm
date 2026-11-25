# Ejemplo tipo J: salto incondicional j (sin ranura de retardo)
# Estado final esperado:
#   $t0 = 1 (el j omite la instruccion que lo cambiaria a 99)
#   $t1 = 2, $t2 = 0 (ciclo de 3 vueltas cerrado con j hacia atras)

        addi  $t0, $zero, 1       # $t0 = 1
        j     salta               # j hacia adelante: omite la siguiente instruccion
        addi  $t0, $zero, 99      # no se ejecuta
salta:  addi  $t1, $zero, 2       # $t1 = 2
        addi  $t2, $zero, 3       # contador = 3
ciclo:  addi  $t2, $t2, -1        # contador--
        beq   $t2, $zero, fin     # al llegar a 0 sale del ciclo
        j     ciclo               # j hacia atras
fin:    j     fin                 # autosalto: punto final observable
