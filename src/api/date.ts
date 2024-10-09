"use server"

export const getDate = async () => {
    const currentDate = new Date();

    const formattedDate = new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      }).format(currentDate);


    return {formattedDate
    }

}